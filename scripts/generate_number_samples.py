import os
import sys
from gtts import gTTS

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

AUDIO_SPECS = [
    # 1. Gujarati Cyber Cell Financial Fraud Case
    {
        "filename": "sample_case_gujarati.mp3",
        "lang": "gu",
        "text": (
            "રાજ્ય સાયબર ક્રાઈમ પોલીસ સ્ટેશન સત્તાવાર સમીક્ષા બેઠક. "
            "કેસ પ્રાથમિકી સંખ્યા એફઆઈઆર 2 0 2 6 9 9 4 1 દાખલ કરવામાં આવી છે. "
            "શંકાસ્પદ બેંક ખાતા નંબર 9 8 7 6 5 4 3 2 1 0 1 2 માંથી ગેરકાયદેસર વ્યવહાર થયો છે. "
            "પીડિતનો મોબાઇલ નંબર 9 8 7 6 5 4 3 2 1 0 અને આધાર સંખ્યા 2 3 4 5 6 7 8 9 0 1 2 3 નોંધાયેલ છે. "
            "ઇન્સ્પેક્ટર પાટીલ ડિજિટલ ફોરેન્સિક લેબ રિપોર્ટનું વિશ્લેષણ કરશે. "
            "તપાસ અધિકારી કલમ 91 સીઆરપીસી નોટિસ મોકલીને બેંક ખાતું તાત્કાલિક ફ્રીઝ કરશે."
        )
    },
    # 2. Gujarati Crypto & Extortion Syndicate
    {
        "filename": "sample_gujarati_crypto_fraud.mp3",
        "lang": "gu",
        "text": (
            "અમદાવાદ સાયબર ક્રાઇમ બ્રાન્ચ ઓપરેશનલ તપાસ. "
            "ગુનો નંબર એફઆઈઆર 2 0 2 6 4 4 8 2 નોંધાયો છે. "
            "ફ્રોડ બેંક ખાતા નંબર 5 5 4 4 3 3 2 2 1 1 0 0 માં ક્રિપ્ટો ફંડ ટ્રાન્સફર થયા છે. "
            "આરોપીનો કોન્ટેક્ટ મોબાઇલ નંબર 9 1 2 3 4 5 6 7 8 9 છે અને આધાર નંબર 4 5 6 7 8 9 0 1 2 3 4 5 છે. "
            "સબ-ઇન્સ્પેક્ટર રાવ નોડલ ઓફિસરને કલમ 91 સીઆરપીસી હેઠળ નોટિસ આપશે."
        )
    },
    # 3. Gujarati Phishing & SIM Swap Case
    {
        "filename": "sample_gujarati_sim_swap.mp3",
        "lang": "gu",
        "text": (
            "સુરત સાયબર સેલ સિમ સ્વેપિંગ તપાસ બેઠક. "
            "કેસ નંબર એફઆઈઆર 2 0 2 6 7 7 1 5 છે. "
            "પીડિતનું બેંક એકાઉન્ટ 6 7 8 9 0 1 2 3 4 5 6 7 માંથી રકમ કપાઈ છે. "
            "નકલી સિમ કાર્ડ માટે મોબાઇલ નંબર 9 8 1 1 2 2 3 3 4 4 ઉપયોગ થયો હતો. "
            "પોલીસ ઇન્સ્પેક્ટર જાડેજા ટેલિકોમ કંપની પાસેથી સીડીઆર લોગ્સ મંગાવશે."
        )
    },
    # 4. Hindi Financial Fraud Case
    {
        "filename": "sample_case_hindi.mp3",
        "lang": "hi",
        "text": (
            "राज्य साइबर क्राइम पुलिस स्टेशन की महत्वपूर्ण समीक्षा बैठक। "
            "केस प्राथमिकी संख्या एफआईआर 2 0 2 6 9 9 4 1 दर्ज किया गया है। "
            "संदિग्ध बैंक खाता संख्या 9 8 7 6 5 4 3 2 1 0 1 2 से अवैध लेन-देन हुआ है। "
            "पीड़ित का मोबाइल नंबर 9 8 7 6 5 4 3 2 1 0 और आधार संख्या 2 3 4 5 6 7 8 9 0 1 2 3 दर्ज है। "
            "इंस्पेक्टर पाटिल डिजिटल फोरेंसिक लैब से रिपोर्ट का विश्लेषण करेंगे। "
            "बैंक मैनेजर को धारा 91 सीआरपीसी नोटिस भेजकर खाता तुरंत फ्रीज किया जाए।"
        )
    },
    # 5. Hinglish Operational Briefing Case
    {
        "filename": "sample_case_hinglish.mp3",
        "lang": "en",
        "tld": "co.in",
        "text": (
            "State Cyber Cell Operational Briefing regarding case FIR 2 0 2 6 9 9 4 1. "
            "Accused transferred funds from suspicious bank account 9 8 7 6 5 4 3 2 1 0 1 2. "
            "Victim mobile number is 9 8 7 6 5 4 3 2 1 0 and Aadhaar reference 2 3 4 5 6 7 8 9 0 1 2 3. "
            "Senior Inspector Patil issued Section 91 CRPC notice to telecom operator for CDR logs. "
            "Sub-Inspector Rao will complete digital forensics analysis and submit the investigation report."
        )
    }
]

def main():
    print("=" * 65)
    print("Generating Spoken Number Audio Samples with gTTS")
    print("=" * 65)

    for spec in AUDIO_SPECS:
        target_path = os.path.join(SAMPLES_DIR, spec["filename"])
        print(f"\nGenerating: {spec['filename']} (lang={spec['lang']})...")
        tld = spec.get("tld", "com")
        tts = gTTS(text=spec["text"], lang=spec["lang"], tld=tld, slow=False)
        tts.save(target_path)
        print(f"  [SAVED] {target_path} ({os.path.getsize(target_path)} bytes)")

    print("\n" + "=" * 65)
    print("All number-articulated audio files generated successfully!")
    print("=" * 65)

if __name__ == "__main__":
    main()
