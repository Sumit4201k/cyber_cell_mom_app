import os
import gc
import re
import uuid
import logging
import threading
from typing import Optional, List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcribe")

# Language-specific Police Domain Initial Prompts
POLICE_INITIAL_PROMPTS: Dict[str, str] = {
    "en": (
        "State Cyber Cell official briefing and crime investigation. Domain terms: FIR, First Information Report, "
        "Section 91 CrPC, Inspector, Sub-Inspector, Constable, Cyber Ticket, IMEI, IP Address, Ransomware, "
        "Mule Account, Bank Account, Aadhaar, PAN, IFSC, Crypto Wallet, Phishing, LockBit, APK Malware, CDR logs."
    ),
    "hi": (
        "राज्य साइबर सेल पुलिस स्टेशन अपराध अनुसंधान समीक्षा बैठक। शब्दावली: केस प्राथमिकी (FIR), बैंक खाता, म्यूल अकाउंट, "
        "मोबाइल नंबर, आधार संख्या, पैन कार्ड, धारा 91 सीआरपीसी नोटिस, सीडीआर रिपोर्ट, डिजिटल फोरेंसिक लैब, साइबर अपराध।"
    ),
    "gu": (
        "રાજ્ય સાયબર ક્રાઈમ પોલીસ સ્ટેશન અપરાધ સમીક્ષા તપાસ બેઠક. સંદર્ભ: કેસ પ્રાથમિકી (FIR), બેંક ખાતા નંબર, "
        "મોબાઇલ નંબર, આધાર સંખ્યા, કલમ 91 સીઆરપીસી નોટિસ, સીડીઆર રિપોર્ટ, ડિજિટલ ફોરેન્સિક લેબ, સાયબર ગુનો."
    )
}


def devanagari_to_gujarati(text: str) -> str:
    """
    Transliterates Devanagari script tokens to native Gujarati script Unicode.
    Gujarati Unicode (\u0A80-\u0AFF) is isomorphic to Devanagari (\u0900-\u097F) with offset +0x0180.
    """
    if not text:
        return ""
    out = []
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            gu_code = code + 0x0180
            out.append(chr(gu_code))
        else:
            out.append(ch)
    return "".join(out)


from pipeline.itn import apply_itn


def sanitize_indic_segment(text: str, target_lang: str = None) -> str:
    """
    Cleans repetitive token hallucinations, looping digit sequences, and foreign non-target glyphs.
    Applies multi-lingual Inverse Text Normalization (ITN) for spoken digit & number conversion.
    Preserves genuine Gujarati, Hindi (Devanagari), Hinglish, and English vocabularies.
    Converts any phonetic Devanagari token outputs in Gujarati sessions to pure native Gujarati script.
    """
    if not text:
        return ""
    t = text.strip()

    # 1. Apply multi-lingual ITN (English, Gujarati, Hindi, Hinglish digits and numbers)
    t = apply_itn(t, target_lang=target_lang)

    # 3. If Gujarati session, ensure all Indic tokens are converted to native Gujarati script
    if target_lang == "gu":
        t = devanagari_to_gujarati(t)

    # 5. Reject pure punctuation, replacement chars, or symbols
    if re.match(r"^[\s,\.\-_/\\\|\:\;~`!@#$%^&*()=+\[\]{}<>?\ufffd\u25c6\?]+$", t):
        return ""

    # 2. Strip foreign non-target scripts (Korean, Cyrillic, CJK, Arabic, Thai, Vietnamese accents, Gurmukhi, Telugu)
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


class SingleActiveModelManager:
    """
    Enforces strictly ONE active Whisper model in RAM at any given time.
    Quantization: INT8 on CPU with 4 threads.
    Dynamic model routing:
      - 'en': Systran/faster-whisper-small -> small -> base
      - 'hi': Systran/faster-whisper-small -> small -> base
      - 'gu': Systran/faster-whisper-small -> small -> base
    """
    _instance: Optional["SingleActiveModelManager"] = None
    _lock: threading.Lock = threading.Lock()

    MODEL_ROUTING: Dict[str, List[str]] = {
        "en": [
            os.getenv("WHISPER_MODEL_EN", "Systran/faster-whisper-small"),
            "small",
            "base"
        ],
        "hi": [
            os.getenv("WHISPER_MODEL_HI", "Systran/faster-whisper-small"),
            "small",
            "base"
        ],
        "gu": [
            os.getenv("WHISPER_MODEL_GU", "Systran/faster-whisper-small"),
            "small",
            "base"
        ]
    }

    def __init__(self):
        self._active_model = None
        self._active_language: Optional[str] = None
        self._device = os.getenv("DEVICE", "cpu")
        self._compute_type = os.getenv("COMPUTE_TYPE", "int8")
        self._cpu_threads = int(os.getenv("WHISPER_THREADS", "4"))
        self._num_workers = 1

    @classmethod
    def get_instance(cls) -> "SingleActiveModelManager":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def evict_active_model(self):
        """
        Unloads any active Whisper model from RAM and triggers garbage collection.
        """
        if self._active_model is not None:
            logger.info(
                f"[SingleActiveModelManager] Evicting active model for language '{self._active_language}' "
                f"from memory (del + gc.collect)..."
            )
            del self._active_model
            self._active_model = None
            self._active_language = None
            gc.collect()

    def get_model(self, language: str = "en"):
        """
        Returns the active WhisperModel for the requested language.
        If a different model is in RAM, evicts it first to maintain single-model residency.
        """
        with self._lock:
            target_lang = (language or "en").lower().strip()
            if target_lang not in ["en", "hi", "gu"]:
                target_lang = "en"

            # Return currently loaded model if language matches
            if self._active_model is not None and self._active_language == target_lang:
                logger.info(f"[SingleActiveModelManager] Reusing active in-memory model for '{target_lang}'.")
                return self._active_model

            # Evict existing model if switching language
            if self._active_model is not None:
                self.evict_active_model()

            # Attempt to load candidate models for target language
            from faster_whisper import WhisperModel

            candidates = self.MODEL_ROUTING.get(target_lang, ["small"])
            last_err = None

            for model_id in candidates:
                try:
                    logger.info(
                        f"[SingleActiveModelManager] Loading model '{model_id}' for '{target_lang}' "
                        f"[device={self._device}, compute_type={self._compute_type}, threads={self._cpu_threads}]..."
                    )
                    model = WhisperModel(
                        model_id,
                        device=self._device,
                        compute_type=self._compute_type,
                        cpu_threads=self._cpu_threads,
                        num_workers=self._num_workers
                    )
                    self._active_model = model
                    self._active_language = target_lang
                    logger.info(f"[SingleActiveModelManager] Successfully loaded and cached model for '{target_lang}'.")
                    return self._active_model
                except Exception as err:
                    logger.warning(
                        f"[SingleActiveModelManager] Candidate model '{model_id}' failed to load: {err}. "
                        "Trying next fallback candidate..."
                    )
                    last_err = err

            logger.error(f"[SingleActiveModelManager] All candidate models failed for '{target_lang}': {last_err}")
            raise RuntimeError(f"Failed to load any Whisper model for language '{target_lang}': {last_err}")

    @property
    def active_language(self) -> Optional[str]:
        return self._active_language

    @property
    def has_active_model(self) -> bool:
        return self._active_model is not None


def transcribe_audio(
    file_bytes: bytes,
    filename: str = "meeting_audio.wav",
    language: str = None
) -> str:
    """
    Transcribes audio bytes offline using the dynamic single-model INT8 speech engine.
    Applies VAD filtering with adaptive fallback, police domain initial prompts,
    surgical Indic sanitization, digit run collapsing, and timestamped formatting.
    """
    if not file_bytes or len(file_bytes) < 100:
        raise ValueError("Audio data is empty or too short (minimum 100 bytes required for transcription).")

    temp_path = None
    try:
        # Normalise language code (e.g. 'hindi' -> 'hi', 'gujarati' -> 'gu', 'english' -> 'en')
        target_lang = language or os.getenv("WHISPER_LANGUAGE", "en")
        if target_lang:
            target_lang = target_lang.strip().lower()
            if target_lang in ["hindi", "hi", "hin"]:
                target_lang = "hi"
            elif target_lang in ["gujarati", "gu", "guj"]:
                target_lang = "gu"
            elif target_lang in ["english", "en", "eng"]:
                target_lang = "en"
            elif target_lang in ["auto", "none", "null"]:
                target_lang = "en"
        else:
            target_lang = "en"

        # 1. Save audio bytes to a temporary location
        os.makedirs("data", exist_ok=True)
        unique_suffix = uuid.uuid4().hex[:8]
        safe_filename = os.path.basename(filename) or "recording.wav"
        suffix = os.path.splitext(safe_filename)[1] or ".wav"
        temp_path = os.path.join("data", f"temp_{unique_suffix}_{safe_filename}")

        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        # 2. Acquire active model from SingleActiveModelManager
        manager = SingleActiveModelManager.get_instance()
        whisper_model_lang = "hi" if target_lang == "gu" else target_lang
        model = manager.get_model(whisper_model_lang)

        # 3. Define decoding parameters
        initial_prompt = POLICE_INITIAL_PROMPTS.get(target_lang, POLICE_INITIAL_PROMPTS["en"])
        whisper_decode_lang = "hi" if target_lang == "gu" else target_lang
        use_vad = os.getenv("WHISPER_VAD", "false").lower() in ("true", "1")

        vad_parameters = dict(
            min_silence_duration_ms=1000,
            speech_pad_ms=500
        ) if use_vad else None

        logger.info(
            f"Transcribing audio {filename} ({len(file_bytes)} bytes) [lang={target_lang}, vad={use_vad}, "
            f"condition_on_prev=False, compression_thresh=2.8, no_speech_thresh=0.6, temp=0.0]..."
        )

        segments, info = model.transcribe(
            temp_path,
            language=whisper_decode_lang,
            beam_size=5,
            vad_filter=use_vad,
            vad_parameters=vad_parameters,
            condition_on_previous_text=False,
            compression_ratio_threshold=2.8,
            no_speech_threshold=0.6,
            temperature=0.0
        )
        detected_lang = target_lang or getattr(info, 'language', 'auto')
        logger.info(f"Speech transcription language: '{detected_lang}' (confidence: {getattr(info, 'language_probability', 1.0):.2f})")

        transcript_lines: List[str] = []
        for segment in segments:
            if getattr(segment, 'no_speech_prob', 0.0) > 0.98:
                continue
            if getattr(segment, 'compression_ratio', 1.0) > 2.8:
                continue
            clean_text = sanitize_indic_segment(segment.text, target_lang=target_lang)
            if clean_text:
                transcript_lines.append(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {clean_text}")

        full_transcript = "\n".join(transcript_lines).strip()
        if not full_transcript:
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
