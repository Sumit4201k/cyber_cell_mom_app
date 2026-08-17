import re

try:
    from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    from presidio_anonymizer import AnonymizerEngine

    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()

    fir_pattern = Pattern(name="fir_pattern", regex=r"\bFIR-\d{4}-\d{4,6}\b", score=1.0)
    fir_recognizer = PatternRecognizer(supported_entity="FIR_ID", patterns=[fir_pattern], name="fir_recognizer")
    analyzer.registry.add_recognizer(fir_recognizer)

    badge_pattern = Pattern(name="badge_pattern", regex=r"\b(POL|ISP|DSP|CONST)-\d{4,6}\b", score=1.0)
    badge_recognizer = PatternRecognizer(supported_entity="BADGE_ID", patterns=[badge_pattern], name="badge_recognizer")
    analyzer.registry.add_recognizer(badge_recognizer)

    ticket_pattern = Pattern(name="ticket_pattern", regex=r"\bCY-\d{4}-\d{4,6}\b", score=1.0)
    ticket_recognizer = PatternRecognizer(supported_entity="CYBER_TICKET", patterns=[ticket_pattern], name="ticket_recognizer")
    analyzer.registry.add_recognizer(ticket_recognizer)
    
    HAS_PRESIDIO = True
except Exception:
    HAS_PRESIDIO = False


def redact_pii(text: str) -> dict:
    if not text:
        return {"redacted_text": "", "entities_found": []}

    if HAS_PRESIDIO:
        try:
            results = analyzer.analyze(
                text=text,
                entities=["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "FIR_ID", "BADGE_ID", "CYBER_TICKET"],
                language="en"
            )
            anonymized_result = anonymizer.anonymize(text=text, analyzer_results=results)
            entities = [
                {
                    "entity_type": res.entity_type,
                    "start": res.start,
                    "end": res.end,
                    "score": res.score,
                    "value": text[res.start:res.end]
                }
                for res in results
            ]
            return {
                "redacted_text": anonymized_result.text,
                "entities_found": entities,
                "raw_text": text
            }
        except Exception:
            pass

    # Regex Fallback PII Engine for CPU Execution
    entities = []
    redacted = text

    # FIR IDs
    fir_matches = list(re.finditer(r"\bFIR-\d{4}-\d{4,6}\b", text, re.IGNORECASE))
    for m in fir_matches:
        entities.append({"entity_type": "FIR_ID", "start": m.start(), "end": m.end(), "value": m.group(0)})

    # Badge IDs
    badge_matches = list(re.finditer(r"\b(POL|ISP|DSP|CONST)-\d{4,6}\b", text, re.IGNORECASE))
    for m in badge_matches:
        entities.append({"entity_type": "BADGE_ID", "start": m.start(), "end": m.end(), "value": m.group(0)})

    # Cyber Tickets
    ticket_matches = list(re.finditer(r"\bCY-\d{4}-\d{4,6}\b", text, re.IGNORECASE))
    for m in ticket_matches:
        entities.append({"entity_type": "CYBER_TICKET", "start": m.start(), "end": m.end(), "value": m.group(0)})

    # Phone numbers
    phone_matches = list(re.finditer(r"\+?\d{1,3}[\s-]?\d{10}\b", text))
    for m in phone_matches:
        entities.append({"entity_type": "PHONE_NUMBER", "start": m.start(), "end": m.end(), "value": m.group(0)})
        redacted = redacted.replace(m.group(0), "[PHONE_NUMBER]")

    return {
        "redacted_text": redacted,
        "entities_found": entities,
        "raw_text": text
    }
