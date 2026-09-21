import re
import logging

logger = logging.getLogger("redact")
logging.getLogger("presidio-analyzer").setLevel(logging.ERROR)
logging.getLogger("presidio-anonymizer").setLevel(logging.ERROR)

# Standardized regex patterns for Indian Cyber Cell & Financial PII
PATTERNS = {
    "AADHAAR_NUMBER": r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b",
    "PAN_NUMBER": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
    "IFSC_CODE": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
    "BANK_ACCOUNT": r"\b(?:account|acc|a/c|a/c\s*no\.?)[\s#:]*(\d{9,18})\b|\b\d{11,18}\b",
    "PHONE_NUMBER": r"(?:\+91[\-\s]?)?[6789]\d{9}\b|\+?\d{1,3}[\s-]?\d{10}\b",
    "FIR_ID": r"\bFIR[-\s]?\d{4}[-\s]?\d{4,6}\b|\bFIR\s*\d{4,6}\b",
    "BADGE_ID": r"\b(?:POL|ISP|DSP|CONST|INSP|SI|ASI|ACP|DCP)[-\s]?\d{4,6}\b",
    "CYBER_TICKET": r"\b(?:CY|CYBER|NCRB|NCRP)[-\s]?\d{4}[-\s]?\d{4,6}\b|\bCY-\d{4,6}\b",
    "EMAIL_ADDRESS": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b"
}

# Optional Presidio initialization
HAS_PRESIDIO = False
analyzer = None
anonymizer = None

try:
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_anonymizer import AnonymizerEngine

    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()

    for entity_name, regex_str in PATTERNS.items():
        pattern = Pattern(name=f"{entity_name.lower()}_pattern", regex=regex_str, score=0.95)
        recognizer = PatternRecognizer(
            supported_entity=entity_name,
            patterns=[pattern],
            name=f"{entity_name.lower()}_recognizer"
        )
        analyzer.registry.add_recognizer(recognizer)

    HAS_PRESIDIO = True
    logger.info("Presidio Analyzer with Indian Cyber PII recognizers initialized.")
except Exception as e:
    HAS_PRESIDIO = False
    logger.info(f"Presidio Analyzer not loaded ({str(e)}). Using high-speed regex PII engine.")


def redact_pii(text: str) -> dict:
    """
    Redacts Personally Identifiable Information (PII) and sensitive police case references.
    Supported entities: Aadhaar, PAN, IFSC, Bank Account, Phone, FIR ID, Badge ID, Cyber Ticket, Email.
    """
    if not text or not isinstance(text, str):
        return {"redacted_text": "", "entities_found": [], "raw_text": ""}

    # 1. Presidio path if available
    if HAS_PRESIDIO and analyzer is not None and anonymizer is not None:
        try:
            target_entities = list(PATTERNS.keys()) + ["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS"]
            results = analyzer.analyze(text=text, entities=target_entities, language="en")
            
            anonymized_result = anonymizer.anonymize(text=text, analyzer_results=results)
            entities = [
                {
                    "entity_type": res.entity_type,
                    "start": res.start,
                    "end": res.end,
                    "score": round(float(res.score), 2),
                    "value": text[res.start:res.end]
                }
                for res in results
            ]
            return {
                "redacted_text": anonymized_result.text,
                "entities_found": entities,
                "raw_text": text
            }
        except Exception as e:
            logger.warning(f"Presidio anonymization error ({str(e)}). Falling back to pure regex engine.")

    # 2. Pure-Python Regex PII & Police Classifier Engine (100% offline CPU)
    entities = []
    
    for entity_type, pattern_str in PATTERNS.items():
        for match in re.finditer(pattern_str, text, re.IGNORECASE):
            val = match.group(0)
            start, end = match.start(), match.end()
            
            # Avoid duplicate or overlapping entity ranges
            if not any(e["start"] <= start < e["end"] or e["start"] < end <= e["end"] for e in entities):
                entities.append({
                    "entity_type": entity_type,
                    "start": start,
                    "end": end,
                    "score": 1.0,
                    "value": val
                })

    # Sort entities by start position in descending order to replace backwards without index shift
    entities.sort(key=lambda x: x["start"], reverse=True)

    redacted_chars = list(text)
    for ent in entities:
        start = ent["start"]
        end = ent["end"]
        tag = f"[{ent['entity_type']}]"
        redacted_chars[start:end] = list(tag)

    # Re-sort entities by start position ascending for clean response metadata
    entities.sort(key=lambda x: x["start"])

    return {
        "redacted_text": "".join(redacted_chars),
        "entities_found": entities,
        "raw_text": text
    }
