# State Cyber Cell — Minutes of Meeting (MoM) & Cryptographic Action Item Management Suite

[![Classification: Restricted Police Property](https://img.shields.io/badge/SECURITY-OFFICIAL%20POLICE%20CLEARANCE-red.svg)](#)
[![2FA: RFC-6238 TOTP](https://img.shields.io/badge/2FA-RFC%206238%20TOTP%20ACTIVE-brightgreen.svg)](#)
[![Audit: SHA-256 Hash Chain](https://img.shields.io/badge/AUDIT%20TRAIL-SHA--256%20CHAIN-blue.svg)](#)
[![Docker Ready](https://img.shields.io/badge/DOCKER-CONTAINERIZED%20READY-blue.svg)](#)
[![License: State Police Property](https://img.shields.io/badge/LICENSE-STATE%20GOVT%20RESTRICTED-darkblue.svg)](#)

---

## 🏛️ System Overview

The **State Cyber Cell MoM Suite** is an enterprise-grade, air-gapped forensic meeting intelligence and audit logging platform designed specifically for law enforcement investigations, crime review briefings, and police command meetings.

### Core Capabilities:
1. **Multilingual Speech Ingestion & Diarization**: Localized `faster-whisper` INT8 AI engine supporting real audio transcription in **English, Hindi, Gujarati, and Hinglish** with zero cloud leakage.
2. **Universal Inverse Text Normalization (ITN)**: Exhaustive phonetic and compound number conversion (0–999) across English, Devanagari, and Gujarati digit systems with multiplier parsing (`double`, `triple`, `ડબલ`, `त्रिपल`).
3. **Automated Indian Cyber PII Redaction (DPDP Act Compliance)**: Automated detection and cryptographic masking of sensitive law enforcement entities (*Aadhaar, PAN, Bank Accounts, Phone Numbers, FIR IDs, Crypto Wallets, Badge IDs*).
4. **Cryptographic SHA-256 Hash-Chain Audit Ledger**: Every meeting action, redaction unmask, action item update, and approval is sealed into an immutable tamper-evident block chain.
5. **Role-Based Access Control (RBAC Level 0 to Level 5)**: Multi-tiered clearance matrix restricting raw PII visibility strictly by police rank.
6. **Strict 2-Factor Authentication (RFC 6238 TOTP)**: Production air-gapped 2FA compatible with Google Authenticator, Microsoft Authenticator, and Authy.
7. **Multi-Page Judicial MoM PDF Generator**: Exports official police reports formatted for judicial proceedings and supervisory review.

---

## 🚀 Quick Start & Setup

> 📖 **For full installation details across all platforms, see [SETUP.md](SETUP.md).**

### 🐳 Option A: Run with Docker (1-Command)
```bash
docker compose up --build
# or: npm run docker:up
```
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Node.js Express API:** [http://localhost:5000](http://localhost:5000)
- **Python AI Engine:** [http://localhost:8000](http://localhost:8000)

### 🪟 Option B: Windows Native Setup
```cmd
setup.bat
run.bat
```

### 🍎 Option C: macOS & Linux Setup
```bash
chmod +x setup.sh run.sh
./setup.sh
./run.sh
```

---

## 🔑 Default Administrator Credentials

| Parameter | Master Administrator Account |
| :--- | :--- |
| **Email** | `admin@cybercell.gov.in` |
| **Username** | `admin` |
| **Security Passphrase** | `CyberCell@2026` |
| **Clearance Level** | **Level 5 — Administrator (Super Clearance)** |
| **Badge ID** | `POL-1001` |
| **Base32 2FA Secret Key** | `JBSWY3DPEHPK3PXP` |

### 📲 Setting Up 2FA on Mobile:
1. Open **Google Authenticator** or **Authy**.
2. Select **Add Account (+)** → **Enter a setup key**.
3. Account name: `State Cyber Cell (admin@cybercell.gov.in)`
4. Key: `JBSWY3DPEHPK3PXP`
5. Type: **Time-based (TOTP)**

---

## 👮 Officer Clearance Matrix (RBAC)

| Tier | Role Title | Clearance Level | PII Visibility & Action Permissions |
| :---: | :--- | :---: | :--- |
| **L5** | **ADMIN** | `5` | **Unrestricted Super Clearance**: Full PII unmasking (including Aadhaar), user provisioning, cryptographic chain inspection, meeting deletion. |
| **L4** | **INVESTIGATOR** | `4` | **Case Lead**: Can unmask Financial PII (PAN, Bank A/C, IFSC), edit MoM action items, and officially approve case records. |
| **L3** | **ANALYST** | `3` | **Forensics Lab**: Can unmask Crypto Wallets, Emails, and Witness Names; run AI audio pipelines. |
| **L2** | **FIELD OFFICER** | `2` | **Tactical Operations**: Can unmask Mobile Phone Numbers & Badge IDs; view assigned tactical tasks. |
| **L1** | **TRAINEE** | `1` | **Station Desk**: Can unmask FIR Case IDs & NCRP Ticket numbers; read-only draft viewing. |
| **L0** | **AUDITOR** | `0` | **Judicial Oversight**: All raw PII is strictly redacted; read-only access to SHA-256 cryptographic audit chain. |

---

## 🧪 Verification & Self-QA

Execute the cryptographic verification suites at any time:

```bash
# 1. Cryptographic ledger integrity & RBAC test suite
npm test

# 2. Universal ITN & Indian Number Lexicon test suite (49 unit tests)
python scripts/test_itn.py

# 3. Real multi-lingual audio test suite (Hindi, Gujarati, Hinglish, English)
python scripts/test_audio_end_to_end.py
```

---

## 🔒 Security & Air-Gap Guarantees

1. **Zero External API Dependencies**: All speech processing, PII redaction, and summary extractions execute 100% locally on localhost without transmitting any data over the internet.
2. **Cryptographic Tamper Detection**: Any direct alteration to `auditLogs.json` breaks the SHA-256 block chain and is immediately flagged upon startup.
3. **Hardware Efficiency**: Optimized for standard CPU hardware with INT8 quantization, using strictly 1 active model in RAM with dynamic eviction.
