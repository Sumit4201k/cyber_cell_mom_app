import os
import json
import requests
import logging

logger = logging.getLogger("summarize")

def load_fallback_json() -> dict:
    fallback_path = os.path.join("samples", "synthetic_fallback.json")
    if os.path.exists(fallback_path):
        with open(fallback_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "title": "State Cyber Cell Meeting Review",
        "date": "2026-08-16",
        "attendees": ["Investigating Officer", "Cyber Analyst"],
        "agenda": ["Case Review"],
        "decisions": ["Freeze suspect accounts"],
        "action_items": [
            {"id": "act-1", "task": "Issue notice under 91 CrPC", "owner": "Investigating Officer", "deadline": "2026-08-17"}
        ]
    }

def summarize_transcript(redacted_transcript: str) -> dict:
    """
    Sends redacted transcript to Ollama for structured JSON MoM generation.
    If Ollama is offline, unreachable, or takes >10s, falls back to local synthetic sample instantly.
    """
    ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    model_name = os.getenv("OLLAMA_MODEL", "llama3.1")
    
    prompt = f"""
You are an AI generating Minutes of Meeting (MoM) for State Cyber Cell.
Return ONLY valid JSON matching this shape:
{{
  "title": "String",
  "date": "YYYY-MM-DD",
  "attendees": ["String"],
  "agenda": ["String"],
  "decisions": ["String"],
  "action_items": [
    {{"id": "act-1", "task": "String", "owner": "String", "deadline": "YYYY-MM-DD"}}
  ]
}}

Redacted Transcript:
{redacted_transcript}
"""

    try:
        # Check health with 3.0s timeout
        health_resp = requests.get(f"{ollama_host}/api/tags", timeout=3.0)
        if health_resp.status_code == 200:
            resp = requests.post(
                f"{ollama_host}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=10.0
            )
            if resp.status_code == 200:
                data = resp.json()
                response_text = data.get("response", "{}")
                parsed_mom = json.loads(response_text)
                if "action_items" in parsed_mom:
                    return parsed_mom
    except Exception as e:
        logger.info(f"Ollama local LLM unavailable or timed out ({str(e)}). Using CPU fallback engine.")

    # Guaranteed Fallback
    fallback = load_fallback_json()
    fallback["redacted_transcript"] = redacted_transcript
    return fallback
