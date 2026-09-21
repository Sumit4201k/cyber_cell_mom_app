import os
import re
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcribe")

# Language-specific conditioning prompts for State Cyber Cell
PROMPT_HINDI = "राज्य साइबर सेल पुलिस स्टेशन समीक्षा बैठक। केस एफआईआर नंबर FIR-2026, संदिग्ध बैंक खाता, मोबाइल नंबर, आधार संख्या, धारा 91 नोटिस, सीडीआर रिपोर्ट।"
PROMPT_GUJARATI = "રાજ્ય સાયબર સેલ પોલીસ સમીક્ષા બેઠક. એફઆઈઆર, બેંક એકાઉન્ટ, પુરાવા, મોબાઈલ નંબર, તપાસ અધિકારી, સીડીઆર."
PROMPT_ENGLISH = "State Cyber Cell police briefing and crime investigation. Domain terms: FIR, First Information Report, Section 91 CrPC, Bank Account, Mobile, CDR, IPDR, Aadhaar, PAN, IFSC, Crypto Wallet, Phishing, LockBit, Ransomware."
PROMPT_AUTO = "State Cyber Cell police briefing. राज्य साइबर सेल पुलिस स्टेशन समीक्षा बैठक। રાજ્ય સાયબર સેલ પોલીસ સમીક્ષા બેઠક."

_cached_model = None

def get_whisper_model():
    """
    Lazy-loads and caches faster-whisper model configured strictly for offline CPU INT8 inference.
    """
    global _cached_model
    if _cached_model is None:
        try:
            from faster_whisper import WhisperModel
            device = os.getenv("DEVICE", "cpu")
            compute_type = os.getenv("COMPUTE_TYPE", "int8")
            model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
            cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "4"))
            
            logger.info(f"Initializing faster-whisper multilingual model '{model_size}' on {device} ({compute_type}, threads={cpu_threads})...")
            _cached_model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type,
                cpu_threads=cpu_threads,
                download_root=os.getenv("WHISPER_CACHE_DIR", None)
            )
            logger.info("faster-whisper multilingual model loaded successfully.")
        except Exception as e:
            logger.error(f"Could not load faster-whisper model: {str(e)}")
            _cached_model = None
            raise RuntimeError(f"Failed to initialize faster-whisper engine: {str(e)}")
    return _cached_model


def sanitize_indic_segment(text: str) -> str:
    """
    Cleans repetitive token hallucinations, looping digit sequences, and foreign non-target glyphs.
    Preserves genuine Gujarati, Hindi (Devanagari), Hinglish, and English vocabularies.
    """
    if not text:
        return ""
    t = text.strip()

    # 1. Reject pure punctuation, replacement chars, or symbols
    if re.match(r"^[\s,\.\-_/\\\|\:\;~`!@#$%^&*()=+\[\]{}<>?\ufffd\u25c6\?]+$", t):
        return ""

    # 2. Strip foreign non-target scripts (Korean, Cyrillic, CJK, Arabic, Thai, Vietnamese accents, Gurmukhi)
    # Retain standard ASCII (32-126), Devanagari (\u0900-\u097F), and Gujarati (\u0A80-\u0AFF)
    t = re.sub(r"[^\x20-\x7E\u0900-\u097F\u0A80-\u0AFF]", " ", t)

    # 3. Collapse looping number sequences (e.g. 10-10-10-10... or 8, 9, 8, 9... or 1-1-1-1...)
    t = re.sub(r"(\b\d+\b(?:[\s\-\,]+\b\d+\b)?)(?:[\s\-\,]+\1){2,}", r"\1", t)

    # 4. Collapse repeating words (e.g. word word word -> word)
    t = re.sub(r"(\b[\w\u0900-\u097F\u0A80-\u0AFF]+\b)(?:[\s\-\,]+\1){2,}", r"\1", t)

    # 5. Clean true runaway degenerate syllable loops (>= 14 chars with low diversity or high single-char ratio)
    def clean_runaway_loop(match):
        block = match.group(0)
        if len(block) >= 14:
            unique_chars = set(block)
            if len(unique_chars) <= 4 or (max(block.count(c) for c in unique_chars) / len(block) > 0.42):
                return ""
        return re.sub(r"(.{1,4}?)\1{3,}", r"\1", block)

    t = re.sub(r"[\u0900-\u097F\u0A80-\u0AFF]{6,}", clean_runaway_loop, t)

    # 6. Generic collapse for repeating 1-6 character patterns
    t = re.sub(r"(.{1,6}?)\1{3,}", r"\1", t)

    # 7. Strip isolated standalone lower-case single letters (remnants of stripped non-ASCII)
    t = re.sub(r"(?<!['\w])[b-hj-zB-HJ-Z](?!['\w])", "", t)

    # 8. Normalize spaces and strip leading/trailing non-alphanumeric punctuation
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"[\s\-\,;:\ufffd\u25c6\?]+$", "", t)
    t = re.sub(r"^[\s\-\,;:\ufffd\u25c6\?]+", "", t).strip()

    # 9. Discard single disconnected noise words from silence hallucinations
    words = [w for w in t.split() if len(w) > 0]
    if not words:
        return ""
    if len(words) <= 2 and len(t) < 12 and not any("\u0900" <= c <= "\u0AFF" for c in t):
        if re.match(r"^(?:govern|protod|clinic|network|information|country care|care)[\s,.]*$", t, re.IGNORECASE):
            return ""

    return t.strip()


def transcribe_audio(file_bytes: bytes, filename: str = "meeting_audio.wav", language: str = None) -> str:
    """
    Transcribes audio bytes offline using faster-whisper CPU INT8 with police vocabulary conditioning.
    Supports Hindi (हिन्दी), Gujarati (ગુજરાતી), Hinglish, and English with auto-fallback.
    """
    if not file_bytes or len(file_bytes) < 100:
        raise ValueError("Audio data is empty or too short (minimum 100 bytes required for transcription).")

    temp_path = None
    try:
        model = get_whisper_model()
        if model is None:
            raise RuntimeError("faster-whisper transcription engine is not initialized.")

        # Create a temporary file safely on Windows
        suffix = os.path.splitext(filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        # Normalise language code (e.g. 'hindi' -> 'hi', 'gujarati' -> 'gu', 'english' -> 'en')
        target_lang = language or os.getenv("WHISPER_LANGUAGE", None)
        if target_lang:
            target_lang = target_lang.strip().lower()
            if target_lang in ["hindi", "hi", "hin"]:
                target_lang = "hi"
            elif target_lang in ["gujarati", "gu", "guj"]:
                target_lang = "gu"
            elif target_lang in ["english", "en", "eng"]:
                target_lang = "en"
            elif target_lang in ["auto", "none", "null"]:
                target_lang = None

        # Select matching initial prompt
        if target_lang == "hi":
            prompt = PROMPT_HINDI
        elif target_lang == "gu":
            prompt = PROMPT_GUJARATI
        elif target_lang == "en":
            prompt = PROMPT_ENGLISH
        else:
            prompt = PROMPT_AUTO

        logger.info(f"Transcribing audio ({len(file_bytes)} bytes) with multilingual support (target_lang={target_lang or 'auto-detect'})...")

        def execute_whisper(use_vad=True):
            return model.transcribe(
                temp_path,
                beam_size=5,
                initial_prompt=prompt,
                language=target_lang,
                vad_filter=use_vad,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    threshold=0.25,
                    speech_pad_ms=300
                ) if use_vad else None,
                condition_on_previous_text=False,
                compression_ratio_threshold=2.4,
                no_speech_threshold=0.6,
                temperature=0.0
            )

        # Primary pass with VAD
        segments, info = execute_whisper(use_vad=True)
        detected_lang = target_lang or getattr(info, 'language', 'auto')
        logger.info(f"Speech transcription language: '{detected_lang}' (confidence: {getattr(info, 'language_probability', 1.0):.2f})")

        transcript_lines = []
        for segment in segments:
            if getattr(segment, 'no_speech_prob', 0.0) > 0.80:
                continue
            if getattr(segment, 'compression_ratio', 1.0) > 2.5:
                continue
            text_clean = sanitize_indic_segment(segment.text)
            if text_clean:
                transcript_lines.append(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {text_clean}")

        # Fallback pass without VAD if acoustic VAD was overly aggressive on subtle speech
        if not transcript_lines:
            logger.info("VAD filter yielded no speech. Re-attempting transcription with relaxed acoustic fallback...")
            segments, info = execute_whisper(use_vad=False)
            for segment in segments:
                if getattr(segment, 'no_speech_prob', 0.0) > 0.85:
                    continue
                if getattr(segment, 'compression_ratio', 1.0) > 2.5:
                    continue
                text_clean = sanitize_indic_segment(segment.text)
                if text_clean:
                    transcript_lines.append(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {text_clean}")

        full_transcript = "\n".join(transcript_lines)
        if not full_transcript.strip():
            raise ValueError("No intelligible speech or words detected in the provided audio file.")

        logger.info(f"Transcription successful. {len(transcript_lines)} clean segments detected.")
        return full_transcript

    except (ValueError, RuntimeError):
        raise
    except Exception as e:
        logger.error(f"faster-whisper transcription encountered an error: {str(e)}")
        raise RuntimeError(f"Audio transcription failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
