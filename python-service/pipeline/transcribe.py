import os
import tempfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcribe")

# Police & Cyber Crime domain conditioning vocabulary
POLICE_INITIAL_PROMPT = (
    "State Cyber Cell investigation briefing. Domain vocabulary: "
    "FIR, First Information Report, Section 91 CrPC, Section 65B Indian Evidence Act, "
    "SIM Swapping, Mule Account, IMEI, CDR, Call Detail Record, IPDR, Bank Manager, "
    "Nodal Officer, Cyber Crime, OTP, USDT, Crypto Wallet, Phishing, LockBit, Ransomware, "
    "APK Malware, Spoofing, Account Freeze, Notice, Subpoena, POL-8842, ISP-1029, CY-2026, "
    "Inspector Deshmukh, DSP Pawar, Constable Sharma, Aadhaar, PAN, IFSC."
)

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
            
            logger.info(f"Initializing faster-whisper model '{model_size}' on {device} ({compute_type}, threads={cpu_threads})...")
            _cached_model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type,
                cpu_threads=cpu_threads,
                download_root=os.getenv("WHISPER_CACHE_DIR", None)
            )
            logger.info("faster-whisper CPU model loaded successfully.")
        except Exception as e:
            logger.error(f"Could not load faster-whisper model: {str(e)}")
            _cached_model = None
            raise RuntimeError(f"Failed to initialize faster-whisper engine: {str(e)}")
    return _cached_model


def transcribe_audio(file_bytes: bytes, filename: str = "meeting_audio.wav") -> str:
    """
    Transcribes audio bytes offline using faster-whisper CPU INT8 with police vocabulary conditioning.
    Throws real descriptive errors if audio is missing/corrupted or transcription fails.
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

        logger.info(f"Transcribing audio file ({len(file_bytes)} bytes) with domain initial_prompt...")
        segments, info = model.transcribe(
            temp_path,
            beam_size=5,
            initial_prompt=POLICE_INITIAL_PROMPT,
            language="en",
            vad_filter=True
        )

        transcript_lines = []
        for segment in segments:
            text_clean = segment.text.strip()
            if text_clean:
                transcript_lines.append(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {text_clean}")

        full_transcript = "\n".join(transcript_lines)
        if not full_transcript.strip():
            raise ValueError("No intelligible speech or words detected in the provided audio file.")

        logger.info(f"Transcription successful. {len(transcript_lines)} segments detected.")
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
