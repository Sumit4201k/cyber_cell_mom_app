import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python-service"))
from pipeline.transcribe import transcribe_audio
from pipeline.redact import redact_pii
from pipeline.summarize import summarize_transcript

clips = [
    ('en', 'samples/sample_youtube_indian_english.wav', 'Indian English Tech Talk (HasGeek)'),
    ('hi', 'samples/sample_youtube_hinglish_podcast.wav', 'Hinglish Startup Podcast (Ranveer Show)'),
    ('gu', 'samples/sample_youtube_gujarati_podcast.wav', 'Gujarati Podcast & Interview (Mihir\'s Mic)')
]

for lang, rel_path, label in clips:
    abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", rel_path)
    print("=" * 70)
    print(f"TESTING: {label} [Language Mode: {lang.upper()}]")
    print("=" * 70)
    
    if not os.path.exists(abs_path):
        print(f"File not found: {abs_path}")
        continue
        
    with open(abs_path, 'rb') as f:
        data = f.read()
        
    transcript = transcribe_audio(data, language=lang)
    print("\n--- TRANSCRIBED TEXT ---")
    print(transcript)
    
    redaction = redact_pii(transcript)
    print("\n--- REDACTED TEXT ---")
    print(redaction['redacted_text'])
    
    print("\n--- DETECTED PII ENTITIES ---")
    entities = redaction.get('entities_found', [])
    if not entities:
        print("  (No sensitive PII found in this open discussion clip)")
    for ent in entities:
        print(f"  [{ent['entity_type']}] -> {ent['value']!r} (offset {ent['start']}:{ent['end']})")
        
    mom = summarize_transcript(redaction['redacted_text'])
    print("\n--- EXTRACTED MINUTES OF MEETING (MoM) ---")
    print(f"  Title: {mom.get('title')}")
    print(f"  Case Reference: {mom.get('case_reference')}")
    print(f"  Crime Category: {mom.get('crime_category')}")
    print(f"  Key Discussion Points: {len(mom.get('discussion_summary', []))} points")
    print(f"  Action Items: {len(mom.get('action_items', []))} items")
    print("\n")
