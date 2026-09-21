import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python-service"))
from pipeline.redact import redact_pii

test_cases = [
    (
        "Hinglish Cyber Crime Incident",
        "Senior Inspector Patil investigated FIR-2026-9941. Accused transferred funds from bank account 987654321012 to Crypto wallet 0x71C8366343CD356E05E09860016431B21E027441 from IP 192.168.1.100. Victim mobile +91 9876543210 and Aadhaar reference 234567890123. PAN ABCDE1234F and IFSC SBIN0001234 were flagged. Sub-Inspector Rao issued Section 91 CRPC notice."
    ),
    (
        "Gujarati Financial Extortion Case",
        "પોલીસ ઇન્સ્પેક્ટર જાડેજા સમીક્ષા કરશે. ગુનો નંબર FIR 20264489 નોંધાયેલ છે. શંકાસ્પદ બેંક ખાતા નંબર 554433221100 અને મોબાઇલ નંબર 9123456789 તેમજ આધાર નંબર 456789012345 છે. સબ-ઇન્સ્પેક્ટર રાવ કલમ 91 સીઆરપીસી નોટિસ આપશે."
    ),
    (
        "Hindi Cyber Fraud Investigation",
        "इंस्पेक्टर पाटिल ने प्राथमिकी संख्या FIR 20269941 दर्ज की। बैंक खाता संख्या 987654321012 फ्रीज किया गया। पीड़ित का मोबाइल नंबर 9876543210 और आधार संख्या 234567890123 है। सब-इंस्पेक्टर राव ने डिजिटल फोरेंसिक लैब से रिपोर्ट मंगाई।"
    )
]

print("=" * 75)
print("CYBER CELL PII ACCURACY BENCHMARK")
print("=" * 75)

for name, text in test_cases:
    print("\n" + "=" * 75)
    print(f"TEST CASE: {name}")
    print("=" * 75)
    print("INPUT TEXT:")
    print(text)
    
    res = redact_pii(text)
    print("\nREDACTED TEXT:")
    print(res["redacted_text"])
    
    print("\nEXTRACTED ENTITIES:")
    for ent in res["entities_found"]:
        print(f"  [{ent['entity_type']:<15}] -> {ent['value']!r} (offset {ent['start']}:{ent['end']})")
