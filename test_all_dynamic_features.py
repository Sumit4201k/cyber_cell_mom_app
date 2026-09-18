"""
Comprehensive Automated Test Runner for State Cyber Cell MoM Application
Tests all dynamic features, synthetic data absence, failure modes, RBAC, and SHA-256 hash chaining.
"""

import os
import sys
import json
import time
import wave
import math
import struct
import subprocess
import requests

PYTHON_SERVICE_URL = "http://localhost:8000"
NODE_BACKEND_URL = "http://localhost:5000"
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend"))

RESULTS = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "suites": {}
}

def log_suite(name):
    print("\n" + "=" * 75)
    print(f"  TEST SUITE: {name}")
    print("=" * 75)
    RESULTS["suites"][name] = {"passed": 0, "failed": 0, "tests": []}

def record_test(suite, name, passed, details=None):
    RESULTS["total_tests"] += 1
    if passed:
        RESULTS["passed"] += 1
        RESULTS["suites"][suite]["passed"] += 1
        print(f"  [PASS] {name}")
    else:
        RESULTS["failed"] += 1
        RESULTS["suites"][suite]["failed"] += 1
        print(f"  [FAIL] {name} -> {details}")
    
    RESULTS["suites"][suite]["tests"].append({
        "name": name,
        "passed": passed,
        "details": details or ""
    })

def create_wav_file(file_path, duration_sec=3.0, sample_rate=16000):
    num_samples = int(duration_sec * sample_rate)
    with wave.open(file_path, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for i in range(num_samples):
            t = float(i) / sample_rate
            val = int(14000.0 * (math.sin(2.0 * math.pi * 350.0 * t) + 0.5 * math.sin(2.0 * math.pi * 700.0 * t)))
            wav_file.writeframes(struct.pack("<h", val))

# -----------------------------------------------------------------------------
# SUITE 1: Frontend Production Build & Components
# -----------------------------------------------------------------------------
def test_frontend_build():
    suite = "1. Frontend Vite Production Build & Asset Integrity"
    log_suite(suite)

    pkg_path = os.path.join(FRONTEND_DIR, "package.json")
    record_test(suite, "Frontend package.json exists", os.path.exists(pkg_path))

    print("  Running Vite Production Build...")
    start_t = time.time()
    try:
        proc = subprocess.run(
            ["npm.cmd" if os.name == "nt" else "npm", "run", "build"],
            cwd=FRONTEND_DIR,
            capture_output=True,
            text=True,
            timeout=120
        )
        duration = time.time() - start_t
        passed = (proc.returncode == 0)
        record_test(suite, f"Vite Production Build succeeded in {duration:.2f}s", passed, proc.stderr if not passed else None)
        
        dist_html = os.path.join(FRONTEND_DIR, "dist", "index.html")
        assets_dir = os.path.join(FRONTEND_DIR, "dist", "assets")
        record_test(suite, "dist/index.html generated", os.path.exists(dist_html))
        has_assets = os.path.exists(assets_dir) and len(os.listdir(assets_dir)) > 0
        record_test(suite, "Production JS and CSS bundles created", has_assets)
    except Exception as e:
        record_test(suite, "Frontend build process", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 2: Real Audio File Upload & Live Mic Speech Ingestion
# -----------------------------------------------------------------------------
def test_audio_upload_and_ingestion():
    suite = "2. Audio Upload & Speech Ingestion Pipeline"
    log_suite(suite)

    wav_path = os.path.abspath("test_police_briefing.wav")
    try:
        create_wav_file(wav_path, duration_sec=2.0)
        record_test(suite, f"Generated real PCM WAV file ({os.path.getsize(wav_path)} bytes)", os.path.exists(wav_path))

        with open(wav_path, "rb") as f:
            files = {"audio": ("test_police_briefing.wav", f, "audio/wav")}
            data = {
                "title": "Hospital Ransomware Emergency Meeting (FIR-2026-3391)",
                "createdBy": "Investigating Officer POL-9921",
                "customTranscript": "Inspector Kulkarni (POL-9921): Briefing on ransomware infection targeting hospital network under case FIR-2026-3391. Threat actor demanding 5 ETH to wallet 0x71C8F39236330295651470123A9FB002A1. Issued Section 91 CrPC notice."
            }
            r = requests.post(
                f"{NODE_BACKEND_URL}/api/meetings/upload",
                files=files,
                data=data,
                headers={"x-demo-role": "INVESTIGATOR"},
                timeout=30
            )

        record_test(suite, "POST /api/meetings/upload returns HTTP 200", r.status_code == 200, r.text)
        res_data = r.json()
        meeting = res_data.get("meeting", {})
        
        record_test(suite, "Meeting record created with unique ID", bool(meeting.get("id")))
        record_test(suite, "Meeting title correctly extracted", "Hospital Ransomware" in meeting.get("title", ""))
        record_test(suite, "Officer POL-9921 recorded as createdBy", meeting.get("createdBy") == "Investigating Officer POL-9921")
        record_test(suite, "Entities correctly detected (FIR_ID, BADGE_ID)", any(e.get("entity_type") == "FIR_ID" for e in meeting.get("entitiesFound", [])))
        
        return meeting.get("id")
    except Exception as e:
        record_test(suite, "Audio upload execution", False, str(e))
        return None
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass

# -----------------------------------------------------------------------------
# SUITE 3: PII Masking, Unmasking & Live SHA-256 Audit Logging
# -----------------------------------------------------------------------------
def test_pii_unmasking_and_audit_logging(meeting_id):
    suite = "3. PII Mask/Unmask Toggling & Cryptographic Audit Ledger"
    log_suite(suite)

    if not meeting_id:
        record_test(suite, "Skipping: Meeting ID missing", False)
        return

    try:
        # 1. Log unmask event as INVESTIGATOR
        unmask_payload = {
            "action": "TOGGLE_PII_UNMASK",
            "resourceId": meeting_id,
            "details": {"entity": "FIR-2026-3391", "unmasked": True}
        }
        r = requests.post(
            f"{NODE_BACKEND_URL}/api/audit-logs/log",
            json=unmask_payload,
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "POST /api/audit-logs/log (TOGGLE_PII_UNMASK) returns HTTP 200", r.status_code == 200)

        # 2. Verify audit ledger integrity & hash chain as AUDITOR
        r_audit = requests.get(
            f"{NODE_BACKEND_URL}/api/audit-logs",
            headers={"x-demo-role": "AUDITOR"},
            timeout=5
        )
        record_test(suite, "GET /api/audit-logs (AUDITOR clearance) returns HTTP 200", r_audit.status_code == 200)
        audit_res = r_audit.json()
        logs = audit_res.get("auditLogs", [])
        integrity = audit_res.get("integrityCheck", {})
        record_test(suite, "Cryptographic hash chain status is VALID", integrity.get("valid") is True)
        record_test(suite, "Audit logs contain TOGGLE_PII_UNMASK entry", any(log.get("action") == "TOGGLE_PII_UNMASK" for log in logs))
        record_test(suite, "Audit ledger logs entry correctly with current timestamp", len(logs) > 0 and bool(logs[0].get("timestamp")))
    except Exception as e:
        record_test(suite, "PII audit logging execution", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 4: Case Title Inline Editing & Action Items Matrix
# -----------------------------------------------------------------------------
def test_title_editing_and_action_items(meeting_id):
    suite = "4. Case Title Inline Editing & Action Items Matrix"
    log_suite(suite)

    if not meeting_id:
        record_test(suite, "Skipping: Meeting ID missing", False)
        return

    try:
        # 1. Edit Title
        new_title = "CRITICAL: Hospital Cyber Extortion Incident Review [FIR-2026-3391]"
        r_title = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/{meeting_id}/title",
            json={"title": new_title},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "PATCH /api/meetings/:id/title returns HTTP 200", r_title.status_code == 200)
        m_updated = r_title.json().get("meeting", {})
        record_test(suite, "Title persisted in meeting record", m_updated.get("title") == new_title)

        # 2. Add, Edit, and Update Action Items
        new_action_items = [
            {
                "id": "act-dyn-1",
                "task": "Issue Section 91 CrPC notice to ISP for IPDR logs",
                "owner": "Investigating Officer POL-9921",
                "deadline": "2026-09-10",
                "status": "IN_PROGRESS"
            },
            {
                "id": "act-dyn-2",
                "task": "Perform memory dump on hospital domain controller",
                "owner": "Analyst ISP-1029",
                "deadline": "2026-09-11",
                "status": "PENDING"
            },
            {
                "id": "act-dyn-3",
                "task": "Submit incident report to Cert-In nodal coordinator",
                "owner": "Technical Lead CONST-5519",
                "deadline": "2026-09-12",
                "status": "PENDING"
            }
        ]

        r_actions = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/{meeting_id}/action-items",
            json={"action_items": new_action_items},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "PATCH /api/meetings/:id/action-items returns HTTP 200", r_actions.status_code == 200)
        m_actions = r_actions.json().get("meeting", {})
        saved_items = m_actions.get("action_items", [])
        record_test(suite, "Action items count matches (3 tasks added/edited)", len(saved_items) == 3)
        record_test(suite, "Action item task content matches", saved_items[0].get("task") == new_action_items[0]["task"])
        record_test(suite, "Action item deadline matches", saved_items[0].get("deadline") == "2026-09-10")

    except Exception as e:
        record_test(suite, "Title editing & action items execution", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 5: Record Approval & Tamper-Proof Locking
# -----------------------------------------------------------------------------
def test_approval_and_locking(meeting_id):
    suite = "5. Record Approval & Tamper-Proof Locking"
    log_suite(suite)

    if not meeting_id:
        record_test(suite, "Skipping: Meeting ID missing", False)
        return

    try:
        # 1. Approve record
        r_app = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/{meeting_id}/approve",
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "POST /api/meetings/:id/approve returns HTTP 200", r_app.status_code == 200)
        m_app = r_app.json().get("meeting", {})
        record_test(suite, "Meeting status changed to OFFICIALLY_APPROVED", m_app.get("status") == "OFFICIALLY_APPROVED")
        record_test(suite, "Meeting approvedBy officer recorded", bool(m_app.get("approvedBy")))

        # 2. Check that editing a locked approved record is prevented
        r_edit_locked = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/{meeting_id}/title",
            json={"title": "Unauthorized Alteration Attempt"},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "Editing approved record returns HTTP 400 (Locked)", r_edit_locked.status_code == 400)
        
        # 3. Check action items edit on locked record is prevented
        r_action_locked = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/{meeting_id}/action-items",
            json={"action_items": []},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "Action items edit on approved record returns HTTP 400 (Locked)", r_action_locked.status_code == 400)

    except Exception as e:
        record_test(suite, "Record approval & locking execution", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 6: Role-Based Access Control (RBAC) Security Verification
# -----------------------------------------------------------------------------
def test_rbac_security_clearance(meeting_id):
    suite = "6. Role-Based Access Control (RBAC) & Clearance Gating"
    log_suite(suite)

    try:
        # 1. Investigator View: Has full access to rawTranscript and entities
        r_inv = requests.get(
            f"{NODE_BACKEND_URL}/api/meetings",
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        m_inv = next((m for m in r_inv.json().get("meetings", []) if m["id"] == meeting_id), None)
        record_test(suite, "INVESTIGATOR sees unmasked rawTranscript", m_inv and "[RESTRICTED - AUDITOR" not in m_inv.get("rawTranscript", ""))
        record_test(suite, "INVESTIGATOR sees entitiesFound array", m_inv and isinstance(m_inv.get("entitiesFound"), list))

        # 2. Auditor View: Raw transcript is masked and entity list cleared
        r_aud = requests.get(
            f"{NODE_BACKEND_URL}/api/meetings",
            headers={"x-demo-role": "AUDITOR"},
            timeout=5
        )
        m_aud = next((m for m in r_aud.json().get("meetings", []) if m["id"] == meeting_id), None)
        record_test(suite, "AUDITOR receives '[RESTRICTED - AUDITOR CLEARANCE LEVEL]' rawTranscript", m_aud and m_aud.get("rawTranscript") == "[RESTRICTED - AUDITOR CLEARANCE LEVEL]")
        record_test(suite, "AUDITOR entitiesFound is empty/sanitized", m_aud and len(m_aud.get("entitiesFound", [])) == 0)

        # 3. Auditor Unauthorized Action Rejection: Cannot upload new audio
        r_aud_upload = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/upload",
            json={"customTranscript": "Auditor rogue transcript"},
            headers={"x-demo-role": "AUDITOR"},
            timeout=5
        )
        record_test(suite, "AUDITOR blocked from POST /upload (HTTP 403 Forbidden)", r_aud_upload.status_code == 403)

        # 4. Auditor Unauthorized Action Rejection: Cannot edit meeting title
        r_aud_title = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/mtg-101/title",
            json={"title": "Rogue Auditor Title"},
            headers={"x-demo-role": "AUDITOR"},
            timeout=5
        )
        record_test(suite, "AUDITOR blocked from PATCH /title (HTTP 403 Forbidden)", r_aud_title.status_code == 403)

        # 5. Auditor Unauthorized Action Rejection: Cannot approve meeting
        r_aud_app = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/mtg-101/approve",
            headers={"x-demo-role": "AUDITOR"},
            timeout=5
        )
        record_test(suite, "AUDITOR blocked from POST /approve (HTTP 403 Forbidden)", r_aud_app.status_code == 403)

    except Exception as e:
        record_test(suite, "RBAC security verification", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 7: Verification of NO Synthetic Fallback Data
# -----------------------------------------------------------------------------
def test_no_synthetic_fallbacks():
    suite = "7. Verification: Zero Synthetic Fallback Leaks"
    log_suite(suite)

    try:
        # 1. Ingest meeting with completely unique custom data
        unique_officer = "Cyber Special Inspector Mane (POL-7711)"
        unique_transcript = "Officer Mane (POL-7711): Reviewing cryptocurrency heist from decentralized exchange. Stolen 250 ETH transferred across tornado cash router. Contact nodal cyber desk."
        
        r = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/upload",
            json={"customTranscript": unique_transcript, "createdBy": unique_officer, "title": "Ethereum Decentralized Heist"},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=10
        )
        record_test(suite, "Unique custom case uploaded successfully", r.status_code == 200)
        data = r.json()
        new_m = data.get("meeting", {})

        # Assert no hardcoded demo strings leaked into the new record
        hardcoded_demo_strings = [
            "Inspector Shinde: Initiated emergency mobile incident briefing",
            "Inspector Deshmukh (POL-8842): Briefed on SIM-Swapping case",
            "SIM swapping incident FIR-2026-9941",
            "Target victim lost 4.2 Lakhs",
            "LockBit ransomware strain on district hospital"
        ]

        leaks = []
        raw_t = new_m.get("rawTranscript", "")
        red_t = new_m.get("redactedTranscript", "")
        for demo_s in hardcoded_demo_strings:
            if demo_s in raw_t or demo_s in red_t:
                leaks.append(demo_s)

        record_test(suite, "Zero hardcoded demo strings in newly created record", len(leaks) == 0, f"Leaked: {leaks}")
        record_test(suite, "Meeting officer correctly set to 'Officer Mane'", "Mane" in new_m.get("createdBy", ""))

        # 2. Clean text with NO PII: should produce empty entitiesFound without injecting fake entities
        clean_transcript = "General Cyber Cell quarterly strategic infrastructure review and server rack audit."
        r_clean = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/upload",
            json={"customTranscript": clean_transcript, "title": "Quarterly Infra Review"},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=10
        )
        clean_m = r_clean.json().get("meeting", {})
        record_test(suite, "Clean transcript with zero PII has empty entitiesFound (no fake entities injected)", len(clean_m.get("entitiesFound", [])) == 0)

    except Exception as e:
        record_test(suite, "Synthetic fallback verification execution", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 8: Failure Modes & Descriptive Error Notifications
# -----------------------------------------------------------------------------
def test_failure_modes_and_error_handling():
    suite = "8. Failure Modes & Descriptive Error Notifications"
    log_suite(suite)

    try:
        # 1. Empty upload (no audio, no transcript)
        r_empty = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/upload",
            json={},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "Empty upload rejected with HTTP 400 Bad Request", r_empty.status_code == 400)
        err_msg = r_empty.json().get("message", "")
        record_test(suite, "Empty upload returns clear error message", "No audio file or transcript" in err_msg)

        # 2. Corrupted audio file (less than 100 bytes / junk data)
        junk_bytes = b"NOT_A_VALID_WAV_HEADER_JUNK_DATA"
        files = {"audio": ("corrupted_audio.wav", junk_bytes, "audio/wav")}
        r_corrupt = requests.post(
            f"{NODE_BACKEND_URL}/api/meetings/upload",
            files=files,
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=10
        )
        record_test(suite, "Corrupt audio rejected with HTTP 400/500/503 without crashing", r_corrupt.status_code in [400, 422, 500, 503])
        corrupt_msg = r_corrupt.json().get("message", "")
        record_test(suite, "Corrupt audio returns clear diagnostic message", bool(corrupt_msg))

        # 3. Non-existent meeting patch
        r_not_found = requests.patch(
            f"{NODE_BACKEND_URL}/api/meetings/mtg-nonexistent-999/title",
            json={"title": "Ghost Meeting"},
            headers={"x-demo-role": "INVESTIGATOR"},
            timeout=5
        )
        record_test(suite, "Updating non-existent meeting returns HTTP 404", r_not_found.status_code == 404)

    except Exception as e:
        record_test(suite, "Failure modes test execution", False, str(e))

# -----------------------------------------------------------------------------
# SUITE 9: 1-Page A4 PDF Layout & Export Verification
# -----------------------------------------------------------------------------
def test_pdf_export_rules():
    suite = "9. Single-Page A4 PDF Export Rules & Print Media"
    log_suite(suite)

    pdf_modal_path = os.path.join(FRONTEND_DIR, "src", "components", "PdfReportModal.jsx")
    record_test(suite, "PdfReportModal.jsx component exists", os.path.exists(pdf_modal_path))

    with open(pdf_modal_path, "r", encoding="utf-8") as f:
        pdf_code = f.read()

    record_test(suite, "CSS @media print rules hide web app containers (.app-container, .cyber-card)", "@media print" in pdf_code and ".app-container" in pdf_code)
    record_test(suite, "A4 portrait page formatting specified (@page { size: A4 portrait })", "A4 portrait" in pdf_code)
    record_test(suite, "Printable document container (#printable-pdf-document) present", "printable-pdf-document" in pdf_code)
    record_test(suite, "Confidentiality property badge present in PDF template", "CONFIDENTIAL" in pdf_code)
    record_test(suite, "Official browser print trigger (window.print()) implemented", "window.print()" in pdf_code)

# -----------------------------------------------------------------------------
# Main Test Orchestrator
# -----------------------------------------------------------------------------
def run_all_qa():
    print("=" * 75)
    print("  STATE CYBER CELL MoM APP — FULL SYSTEM DYNAMIC TEST SUITE")
    print("=" * 75)

    test_frontend_build()
    meeting_id = test_audio_upload_and_ingestion()
    test_pii_unmasking_and_audit_logging(meeting_id)
    test_title_editing_and_action_items(meeting_id)
    test_approval_and_locking(meeting_id)
    test_rbac_security_clearance(meeting_id)
    test_no_synthetic_fallbacks()
    test_failure_modes_and_error_handling()
    test_pdf_export_rules()

    print("\n" + "=" * 75)
    print(f"  TEST SUMMARY: {RESULTS['passed']}/{RESULTS['total_tests']} PASSED ({RESULTS['failed']} FAILED)")
    print("=" * 75)

    with open("dynamic_feature_test_report.json", "w", encoding="utf-8") as f:
        json.dump(RESULTS, f, indent=2)

    return RESULTS["failed"] == 0

if __name__ == "__main__":
    success = run_all_qa()
    sys.exit(0 if success else 1)
