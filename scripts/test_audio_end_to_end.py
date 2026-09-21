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

audio_tests = [
    ('gu', 'samples/sample_gujarati_sim_swap.mp3', 'Gujarati SIM Swap Audio'),
    ('gu', 'samples/sample_gujarati_crypto_fraud.mp3', 'Gujarati Crypto Fraud Audio'),
    ('gu', 'samples/sample_case_gujarati.mp3', 'Gujarati Financial Fraud Audio'),
    ('hi', 'samples/sample_case_hindi.mp3', 'Hindi Review Meeting Audio'),
    ('en', 'samples/sample_case_hinglish.mp3', 'Hinglish Cyber Cell Audio')
]

print("=" * 75)
print("REAL AUDIO END-TO-END PIPELINE VERIFICATION")
print("=" * 75)

for lang, rel_path, label in audio_tests:
    abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", rel_path)
    print("\n" + "=" * 75)
    print(f"AUDIO FILE: {label} [{lang.upper()}] -> {rel_path}")
    print("=" * 75)
    
    if not os.path.exists(abs_path):
        print(f"Audio file not found: {abs_path}")
        continue
        
    with open(abs_path, 'rb') as f:
        audio_data = f.read()
        
    print(f"1. Transcribing {len(audio_data)} bytes with INT8 engine...")
    raw_transcript = transcribe_audio(audio_data, language=lang)
    print("\n--- RAW TRANSCRIPT ---")
    print(raw_transcript)
    
    print("\n2. Applying Contextual PII Redaction...")
    redaction = redact_pii(raw_transcript)
    print("\n--- REDACTED TRANSCRIPT ---")
    print(redaction['redacted_text'])
    
    print("\n--- DETECTED PII ENTITIES ---")
    for ent in redaction.get('entities_found', []):
        print(f"  [{ent['entity_type']:<15}] -> {ent['value']!r} (offset {ent['start']}:{ent['end']})")
        
    print("\n3. Dynamic MoM Summary:")
    mom = summarize_transcript(redaction['redacted_text'])
    print(f"  Title: {mom.get('title')}")
    print(f"  Case Ref: {mom.get('case_reference')}")
    print(f"  Attendees: {mom.get('attendees')}")
    print(f"  Action Items: {len(mom.get('action_items', []))} items")
