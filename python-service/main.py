import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pipeline.transcribe import transcribe_audio
from pipeline.redact import redact_pii
from pipeline.summarize import summarize_transcript

app = FastAPI(title="State Cyber Cell ML Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-ml-pipeline"}

@app.post("/process-meeting")
async def process_meeting(file: UploadFile = File(None), is_demo_fallback: bool = Form(False)):
    filename = file.filename if file else "sample_cyber_incident.wav"
    audio_bytes = await file.read() if file else b""
    
    # 1. Transcribe audio
    transcript = transcribe_audio(audio_bytes, filename)
    
    # 2. Redact PII (Standard + Police Custom Recognizers: FIR, Badge ID, Cyber Ticket)
    redaction_result = redact_pii(transcript)
    
    # 3. Summarize via Ollama or Instant CPU Fallback Engine
    mom_result = summarize_transcript(redaction_result["redacted_text"])
    
    return {
        "status": "success",
        "filename": filename,
        "raw_transcript": transcript,
        "redacted_transcript": redaction_result["redacted_text"],
        "entities_found": redaction_result["entities_found"],
        "mom": mom_result
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
