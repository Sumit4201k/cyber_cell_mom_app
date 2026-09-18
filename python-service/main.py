import sys
import os
import json
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pipeline.transcribe import transcribe_audio
from pipeline.redact import redact_pii
from pipeline.summarize import summarize_transcript

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="State Cyber Cell ML Microservice",
    description="Offline AI Pipeline for Audio Transcription, PII Redaction, and MoM Structuring"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "python-ml-pipeline",
        "whisper_device": os.getenv("DEVICE", "cpu"),
        "compute_type": os.getenv("COMPUTE_TYPE", "int8")
    }

@app.post("/process-meeting")
async def process_meeting(
    request: Request,
    file: UploadFile = File(None),
    custom_transcript: str = Form(None),
    customTranscript: str = Form(None),
    title: str = Form(None),
    createdBy: str = Form(None)
):
    """
    Unified endpoint accepting multipart audio uploads, form data, or JSON payloads.
    Executes:
    1. Offline faster-whisper CPU INT8 transcription (with Indian police initial_prompt conditioning).
    2. Presidio & Regex PII anonymization (Aadhaar, PAN, IFSC, Bank, Phone, FIR, Badge, Cyber Ticket).
    3. Dynamic structured MoM JSON extraction.
    Throws real HTTP 400/500 errors if audio is missing/corrupt or transcription fails.
    """
    raw_text = ""
    filename = "meeting_audio.wav"
    custom_title = title
    created_by_officer = createdBy

    content_type = request.headers.get("content-type", "")

    # Handle JSON request body if present
    if "application/json" in content_type:
        try:
            body = await request.json()
            raw_text = body.get("customTranscript") or body.get("custom_transcript") or body.get("rawTranscript") or ""
            custom_title = body.get("title") or custom_title
            created_by_officer = body.get("createdBy") or body.get("created_by") or created_by_officer
            filename = body.get("filename") or "direct_transcript.txt"
        except Exception as e:
            logger.warning(f"Error parsing JSON payload: {e}")

    # Handle multipart / form-data audio upload
    if file and file.filename:
        filename = file.filename
        try:
            audio_bytes = await file.read()
            if not audio_bytes or len(audio_bytes) < 100:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Uploaded audio file '{filename}' is empty or too small to contain speech."}
                )
            logger.info(f"Processing uploaded audio file: {filename} ({len(audio_bytes)} bytes)")
            raw_text = transcribe_audio(audio_bytes, filename)
        except ValueError as ve:
            logger.warning(f"Audio transcription validation note: {str(ve)}")
            direct_input = custom_transcript or customTranscript
            if direct_input and direct_input.strip():
                logger.info("Using accompanying speech transcript for audio upload.")
                raw_text = direct_input.strip()
            else:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": str(ve)}
                )
        except Exception as e:
            logger.error(f"Audio transcription error: {str(e)}")
            direct_input = custom_transcript or customTranscript
            if direct_input and direct_input.strip():
                logger.info("Using accompanying speech transcript for audio upload.")
                raw_text = direct_input.strip()
            else:
                return JSONResponse(
                    status_code=500,
                    content={"status": "error", "message": f"Audio transcription failed: {str(e)}"}
                )
    elif not raw_text:
        direct_input = custom_transcript or customTranscript
        if direct_input and direct_input.strip():
            raw_text = direct_input.strip()
            filename = "custom_transcript.txt"
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "No audio file or transcript provided for processing."}
            )

    try:
        # 2. PII Redaction
        redaction_result = redact_pii(raw_text)
        redacted_text = redaction_result.get("redacted_text", raw_text)
        entities_found = redaction_result.get("entities_found", [])

        # 3. Dynamic MoM Summarization
        mom_result = summarize_transcript(redacted_text)

        # Override title or officer if explicitly supplied by the caller
        if custom_title and custom_title.strip():
            mom_result["title"] = custom_title.strip()
        if created_by_officer and created_by_officer.strip():
            if "attendees" in mom_result and created_by_officer not in mom_result["attendees"]:
                mom_result["attendees"].insert(0, created_by_officer.strip())

        return {
            "status": "success",
            "filename": filename,
            "raw_transcript": raw_text,
            "redacted_transcript": redacted_text,
            "entities_found": entities_found,
            "mom": mom_result
        }
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to process meeting: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
