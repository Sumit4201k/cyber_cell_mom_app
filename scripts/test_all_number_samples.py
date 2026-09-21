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

samples = [
    ('en', 'samples/sample_case_hinglish.mp3', 'Hinglish Cyber Cell Briefing (Spoken Digits)'),
    ('hi', 'samples/sample_case_hindi.mp3', 'Hindi Review Meeting (Spoken Digits)'),
    ('gu', 'samples/sample_case_gujarati.mp3', 'Gujarati Financial Fraud Case (Spoken Digits)'),
    ('gu', 'samples/sample_gujarati_crypto_fraud.mp3', 'Gujarati Crypto Fraud Investigation (Spoken Digits)'),
    ('gu', 'samples/sample_gujarati_sim_swap.mp3', 'Gujarati SIM Swap Investigation (Spoken Digits)')
]

print("=" * 75)
print("TESTING MULTI-LANGUAGE NUMBER TRANSCRIPTION & PII EXTRACTION")
print("=" * 75)

for lang, rel_path, label in samples:
    abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", rel_path)
    print("\n" + "=" * 75)
    print(f"SAMPLE: {label} [{lang.upper()}] -> {rel_path}")
    print("=" * 75)
    
    if not os.path.exists(abs_path):
        print(f"File not found: {abs_path}")
        continue
        
    with open(abs_path, 'rb') as f:
        data = f.read()
        
    transcript = transcribe_audio(data, language=lang)
    print("\n--- 1. RAW SPEECH TRANSCRIPT ---")
    print(transcript)
    
    redaction = redact_pii(transcript)
    print("\n--- 2. REDACTED TRANSCRIPT ---")
    print(redaction['redacted_text'])
    
    print("\n--- 3. EXTRACTED PII ENTITIES ---")
    entities = redaction.get('entities_found', [])
    for ent in entities:
        print(f"  [{ent['entity_type']}] -> {ent['value']!r} (offset {ent['start']}:{ent['end']})")
        
    mom = summarize_transcript(redaction['redacted_text'])
    print("\n--- 4. EXTRACTED MoM SUMMARY ---")
    print(f"  Title: {mom.get('title')}")
    print(f"  Case Reference: {mom.get('case_reference')}")
    print(f"  Crime Category: {mom.get('crime_category')}")
    print(f"  Attendees: {mom.get('attendees')}")
    print(f"  Action Items: {len(mom.get('action_items', []))} items")
