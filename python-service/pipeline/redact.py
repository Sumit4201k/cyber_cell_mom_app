import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger("redact")
logging.getLogger("presidio-analyzer").setLevel(logging.ERROR)
logging.getLogger("presidio-anonymizer").setLevel(logging.ERROR)

# Hindi/Hinglish stop words and non-name function words to filter out from PERSON entities
NON_NAME_WORDS = {
    "ne", "ko", "se", "hai", "hain", "tha", "the", "thi", "diya", "diye", "bheja", "bheje", "karenge",
    "karega", "karta", "karte", "par", "mein", "aur", "ya", "tak", "hota", "hote", "gaya", "gaye", "gayi",
    "section", "crpc", "fir", "cdr", "ipdr", "analysis", "report", "notice", "bank", "account", "mobile",
    "police", "cell", "cyber", "station", "regarding", "case", "victim", "accused", "briefing", "operational",
    "friday", "monday", "tuesday", "wednesday", "thursday", "saturday", "sunday", "today", "tomorrow", "odhanit",
    "aadha", "aadhar", "aadhaar", "references", "reference", "say", "hai", "kia", "kya", "or",
    "digital", "forensic", "forensics", "lab", "laboratory", "telecom", "operator", "department", "unit",
    "syndicate", "team", "branch", "division", "headquarters", "server", "gateway", "portal", "device",
    "shunya", "samik", "shah", "baithak", "raja", "saiba", "awaid", "lindeen", "darjh", "vishleshan",
    "dhara", "freejh", "turanth", "bhej", "dakhil", "karyavahi", "aadesh", "patra", "suchna",
    "itna", "zyada", "jyada", "bahut", "pratical", "practical", "knowledge", "career", "perspective",
    "इतना", "ज्यादा", "बहुत", "नॉलेज", "प्रैक्टिकल", "प्रक्तिकल", "શેર", "વાત", "ખાસ", "ચર્ચા",
    "નંબર", "સંખ્યા", "ખાતા", "ખાતું", "મોબાઇલ", "આધાર", "થાયો", "થયું", "હતો", "હતી", "નોડલ",
    "હેઠળ", "હેતલ", "પાસેથી", "મંગાવશે", "કરશે", "દાખલ", "નોંધાયો", "નોંધાયેલ", "તપાસ", "અધિકારી",
    "અપિસર", "ઓફિસર", "કલમ", "નોટિસ", "લેબ", "રિપોર્ટ", "સત્ટાવાર", "સત્તાવાર", "સમીક્ષા", "બેઠક",
    "બેટક", "સ્ટેશન", "પોલીસ", "બ્રાન્ચ", "બ્રાઈંચ", "રકમ", "કપાઈ", "ગેરકાયદેસર", "વ્યવહાર", "પીડિત",
    "તેલિકોં", "ટેલિકોમ", "ટેલિકૉમ", "દિજિતલ", "દિજિટલ", "ડિજિટલ", "ફોરેન્સિક", "ફોરેન્સીક", "લેબ", "લેબોરેટરી",
    "કમપની", "કંપની", "માટે", "માતે", "વિશે", "વીષે", "દિજિટલ", "दिजिटल", "डिजिटल", "फोरेंसिक", "फोरेन्सिक",
    "लैब", "लेब", "कंपनी", "कमपनी", "टेलीकॉम", "टेलीकाम",
    "ने", "को", "से", "का", "की", "के", "તરીકે", "સાથે", "વડે", "દ્વારા", "તરફથી", "મારફત", "પ્રાથમિકી", "प्राथमिकी", "दर्ज", "નંબર"
}

# Standardized regex patterns for Indian Cyber Cell & Financial PII with priority scoring
PATTERN_SPECS = [
    # 1. FIR / Case Identifier (e.g. FIR-2026-9941 or FIR 2026, 9941 or case 20269941 or CR 12/2026)
    {
        "type": "FIR_ID",
        "pattern": r"\b(?:FIR|case|CR|मुकदमा|ગુનો|કેસ|केस\s*प्राथमिकी\s*संख्या|કેસ\s*પ્રાથમિકી\s*સંખ્યા|કેસ\s*નંબર|ગુનો\s*નંબર)(?:[\s#.,:-]|no|number|num|for|નંબર|સંખ્યા|संख्या)*?(\d{4}[-\s,]*\d{2,6})\b|\b(?:FIR|case|CR)(?:[\s#.,:-]|no|number|num|for|નંબર|સંખ્યા)*?(\d{4,8})\b",
        "priority": 10
    },
    # 2. Bank Account with contextual cue (English, Hindi, Gujarati)
    {
        "type": "BANK_ACCOUNT",
        "pattern": r"(?:bank\s*account|account|acc|a/c|a/c\s*no\.?|khata|beneficiary|mule\s*account|ખાતા\s*નંબર|બેંક\s*ખાતા\s*નંબર|બેંકે\s*ખાતા|બેંક\s*ખાતા|બેંક\s*ખાતું|બેંકે\s*કાૂંટ|બેંક\s*કાૂંટ|બેંકે\s*કાઉન્ટ|બેંક\s*કાઉન્ટ|બેંક\s*એકાઉન્ટ|બેંકે\s*એકાઉન્ટ|બએંખ\s*ખાતા|બએંખ|ખાતા|ખાતુ|ખાતું|એકાઉન્ટ|खाता\s*संख्या|खाता\s*संक्या|खाता\s*नंबर|बैंक\s*खाता|भेंद\s*काता|भेंद|बैंद\s*खाता\s*संक्या|बैंद\s*खाता|बैंद\s*काता|बैंध\s*काता|बैंद\s*खाता|बैंध\s*खाता|आंध\s*काता\s*संख्या|आंध\s*काता|મ्यूલ\s*અકાઉન્ટ)(?:[\s#.,:-]|no|number|num|is|number\s*is|નંબર|સંખ્યા|संख्या|संक्या|કાતા|ખાતા|ખાતું|खाता)*?(\d(?:[\-\s]?\d){8,17})\b",
        "priority": 9.8
    },
    # 3. Aadhaar Reference with contextual cue (English, Hindi, Gujarati)
    {
        "type": "AADHAAR_NUMBER",
        "pattern": r"(?:aadhaar|aadhar|aadha|uidai|આધાર\s*નંબર|આધાર\s*સંખ્યા|આધાર\s*નમવ|આધાર\s*નમવર|આધાર|આદાર\s*નંબર|આદાર\s*સંખ્યા|આદાર\s*નમવ|આદાર|आधार\s*संख्या|आधार\s*संक्या|आधार\s*नंबर|आधार|आदार\s*संख्या|आदार\s*संक्या|आदार\s*नंबर|आदार|आदादार\s*संक्या|आदादार\s*संख्या|आदादार)(?:[\s#.,:-]|no|number|num|ref|reference|references|is|નંબર|સંખ્યા|संख्या|संक्या|संक्या)*?([2-9](?:[\-\s]?\d){11})\b",
        "priority": 9.6
    },
    # 4. PAN Number (e.g. ABCDE1234F)
    {
        "type": "PAN_NUMBER",
        "pattern": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
        "priority": 9.4
    },
    # 5. IFSC Code (e.g. SBIN0001234)
    {
        "type": "IFSC_CODE",
        "pattern": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "priority": 9.4
    },
    # 6. Crypto Wallet Address (BTC, ETH, BSC, Tron)
    {
        "type": "CRYPTO_WALLET",
        "pattern": r"\b(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}|T[a-zA-Z0-9]{33})\b",
        "priority": 9.3
    },
    # 7. IPv4 Network Address
    {
        "type": "IP_ADDRESS",
        "pattern": r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
        "priority": 9.2
    },
    # 8. IMEI Device Number (15 digits)
    {
        "type": "IMEI_NUMBER",
        "pattern": r"(?:imei|device\s*id|handset)(?:[\s#.,:-]|no|number|num|is)*?(\d{15})\b",
        "priority": 9.1
    },
    # 9. Standalone Aadhaar (spaced 4-4-4 or continuous 12 digits starting with 2-9)
    {
        "type": "AADHAAR_NUMBER",
        "pattern": r"\b([2-9]\d{3}\s\d{4}\s\d{4})\b|\b([2-9]\d{11})\b",
        "priority": 8.0
    },
    # 10. Mobile / Phone Number (10 digits starting with 6-9)
    {
        "type": "PHONE_NUMBER",
        "pattern": r"(?:mobile|phone|contact|mob|cell|મોબાઇલ\s*નંબર|મોબાઈલ\s*નંબર|મોબાલ\s*નમવ|મોબાલ\s*નંબર|મોબાઇલ|મોબાઈલ|કોન્ટેક્ટ|ફોન|मोबाइल\s*नंबर|फ़ोन\s*नंबर|मोबाल\s*नमब|मोबाल\s*नंबर|मोबाईल\s*नंबर|मोबाइल|मोबाल|फ़ोन)(?:[\s#.,:-]|no|number|num|is|નંબર|સંખ્યા|संख्या|नमब|નમવ)*?((?:\+91[\-\s]?)?[6789](?:[\-\s]?\d){9})\b|\b((?:\+91[\-\s]?)?[6789]\d{9})\b",
        "priority": 7.5
    },
    # 11. Badge ID / Cyber Ticket
    {
        "type": "BADGE_ID",
        "pattern": r"\b(?:POL|ISP|DSP|CONST|INSP|SI|ASI|ACP|DCP)[-\s]?\d{4,6}\b",
        "priority": 8.5
    },
    {
        "type": "CYBER_TICKET",
        "pattern": r"\b(?:CY|CYBER|NCRB|NCRP)[-\s]?\d{4}[-\s]?\d{4,6}\b|\bCY-\d{4,6}\b",
        "priority": 8.5
    },
    # 12. Email Address
    {
        "type": "EMAIL_ADDRESS",
        "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b",
        "priority": 9.0
    }
]

# Optional Presidio initialization
HAS_PRESIDIO = False
analyzer = None
anonymizer = None

try:
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_anonymizer import AnonymizerEngine

    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
    HAS_PRESIDIO = True
    logger.info("Presidio Analyzer with Indian Cyber PII engine loaded.")
except Exception as e:
    HAS_PRESIDIO = False
    logger.info(f"Presidio Analyzer not loaded ({str(e)}). Using regex PII engine.")


def clean_person_name(name: str) -> str:
    """
    Strips trailing punctuation, Romanized Hindi/Gujarati postpositions and domain nouns.
    """
    if not name:
        return ""
    words = name.strip().split()
    while words and (words[-1].lower() in NON_NAME_WORDS or words[-1] in NON_NAME_WORDS):
        words.pop()
    while words and (words[0].lower() in NON_NAME_WORDS or words[0] in NON_NAME_WORDS):
        words.pop(0)
    
    cleaned = " ".join(words).strip(" ,.-;:")
    if len(cleaned) < 2 or cleaned.lower() in NON_NAME_WORDS or cleaned in NON_NAME_WORDS:
        return ""
    return cleaned


from pipeline.itn import apply_itn


def normalize_pii_numbers(t: str) -> str:
    if not t:
        return ""
    lines = t.split("\n")
    processed = []
    for line in lines:
        header = ""
        body = line
        m = re.match(r"^(\[\d+\.\d+s\s*->\s*\d+\.\d+s\]\s*)(.*)$", line)
        if m:
            header = m.group(1)
            body = m.group(2)

        body = apply_itn(body)
        processed.append(header + body)

    return "\n".join(processed)


def redact_pii(text: str) -> dict:
    """
    Context-aware PII Redaction Engine with priority resolution and zero overlapping tag collisions.
    Supported entities: Aadhaar, PAN, IFSC, Bank Account, Phone, FIR ID, Badge ID, Cyber Ticket, Email, Person.
    """
    if not text or not isinstance(text, str):
        return {"redacted_text": "", "entities_found": [], "raw_text": ""}

    text = normalize_pii_numbers(text)
    candidate_entities: List[Dict[str, Any]] = []

    # 1. Regex Pattern Matching with Context and Named Boundaries
    for spec in PATTERN_SPECS:
        etype = spec["type"]
        prio = spec["priority"]
        flags = re.IGNORECASE if etype not in ["PAN_NUMBER", "IFSC_CODE"] else 0
        for match in re.finditer(spec["pattern"], text, flags):
            matched = False
            for idx in range(1, len(match.groups()) + 1):
                if match.group(idx):
                    val = match.group(idx)
                    s = match.start(idx)
                    e = match.end(idx)
                    if etype == "FIR_ID":
                        val = match.group(0)
                        s = match.start()
                        e = match.end()

                    candidate_entities.append({
                        "entity_type": etype,
                        "start": s,
                        "end": e,
                        "score": 0.95,
                        "value": val,
                        "priority": prio
                    })
                    matched = True
                    break
            if not matched:
                val = match.group(0)
                s = match.start()
                e = match.end()
                candidate_entities.append({
                    "entity_type": etype,
                    "start": s,
                    "end": e,
                    "score": 0.95,
                    "value": val,
                    "priority": prio
                })

    # 2. Extract genuine Person / Officer names with context
    officer_pattern = r"(?:Senior Inspector|Sub-Inspector|Inspector|SI|ASI|DSP|ACP|DCP|Constable|Officer|Mr\.|Ms\.|Dr\.|इंस्पेक्टर|इन्स्पेक्ता|सब-इंस्पेक्टर|अधिकारी|ઇન્સ્પેક્ટર|ઇન્સપેક્ટર|સબ-ઇન્સ્પેક્ટર|સબ\s*ઇન્સ્પેક્તર|પોલીસ\s*ઇન્સ્પેક્ટર|પોલી\s*સિંસ્પેક્ટર|ઇન્સ્પેક્તર|અધિકારી)\s+([A-Z\u0900-\u097F\u0A80-\u0AFF][a-zA-Z\u0900-\u097F\u0A80-\u0AFF]+(?:\s+[A-Z\u0900-\u097F\u0A80-\u0AFF][a-zA-Z\u0900-\u097F\u0A80-\u0AFF]+)?)"
    for match in re.finditer(officer_pattern, text):
        raw_name = match.group(1)
        cleaned_name = clean_person_name(raw_name)
        if cleaned_name and cleaned_name.lower() not in NON_NAME_WORDS:
            s = match.start(1)
            e = s + len(cleaned_name)
            candidate_entities.append({
                "entity_type": "PERSON",
                "start": s,
                "end": e,
                "score": 0.90,
                "value": cleaned_name,
                "priority": 6
            })

    # 3. Presidio fallback for general names in Latin/English text
    if HAS_PRESIDIO and analyzer is not None:
        try:
            presidio_results = analyzer.analyze(text=text, entities=["PERSON"], language="en")
            for res in presidio_results:
                raw_val = text[res.start:res.end]
                # Only keep genuine Latin-based name tokens
                if any(c.isascii() and c.isalpha() for c in raw_val):
                    cleaned = clean_person_name(raw_val)
                    if cleaned and len(cleaned) >= 3 and cleaned.lower() not in NON_NAME_WORDS:
                        candidate_entities.append({
                            "entity_type": "PERSON",
                            "start": res.start,
                            "end": res.start + len(cleaned),
                            "score": round(float(res.score), 2),
                            "value": cleaned,
                            "priority": 5
                        })
        except Exception as e:
            logger.debug(f"Presidio analyze pass note: {e}")

    # 4. Resolve Overlapping Entities (Highest Priority Wins, No Double-Tagging)
    candidate_entities.sort(key=lambda x: -x["priority"])
    resolved_entities: List[Dict[str, Any]] = []

    for ent in candidate_entities:
        overlap = False
        for res in resolved_entities:
            if max(ent["start"], res["start"]) < min(ent["end"], res["end"]):
                overlap = True
                break
        if not overlap:
            resolved_entities.append(ent)

    # 5. Sort by start index ascending
    resolved_entities.sort(key=lambda x: x["start"])

    # 6. Apply Redaction (from end of string to start to preserve character offsets)
    redacted_text = text
    for ent in sorted(resolved_entities, key=lambda x: x["start"], reverse=True):
        tag = f"<{ent['entity_type']}>"
        redacted_text = redacted_text[:ent["start"]] + tag + redacted_text[ent["end"]:]

    return {
        "redacted_text": redacted_text,
        "entities_found": resolved_entities,
        "raw_text": text
    }
