# State Cyber Cell — Minutes of Meeting (MoM) & Cryptographic Action Item Management Suite

[![Classification: Restricted Police Property](https://img.shields.io/badge/SECURITY-OFFICIAL%20POLICE%20CLEARANCE-red.svg)](#)
[![2FA: RFC-6238 TOTP](https://img.shields.io/badge/2FA-RFC%206238%20TOTP%20ACTIVE-brightgreen.svg)](#)
[![Audit: SHA-256 Hash Chain](https://img.shields.io/badge/AUDIT%20TRAIL-SHA--256%20CHAIN-blue.svg)](#)
[![License: State Police Property](https://img.shields.io/badge/LICENSE-STATE%20GOVT%20RESTRICTED-darkblue.svg)](#)

---

## 🏛️ System Overview

The **State Cyber Cell MoM Suite** is an enterprise-grade, air-gapped forensic meeting intelligence and audit logging platform designed specifically for law enforcement investigations and police command meetings.

### Core Capabilities:
1. **Multilingual Speech Ingestion & Diarization**: Uses localized `faster-whisper` AI to transcribe spoken briefings in **English, Hindi, Gujarati, and Hinglish** with zero cloud leakage.
2. **Automated PII Redaction (DPDP Act Compliance)**: Automated detection and cryptographic masking of sensitive entities (*Aadhaar, PAN, Bank Accounts, Phone Numbers, FIR IDs, Crypto Wallets, Badge IDs*).
3. **Cryptographic SHA-256 Hash-Chain Audit Ledger**: Every action, redaction unmask, action item edit, and approval is sealed into an immutable tamper-evident block chain.
4. **Role-Based Access Control (RBAC Level 0 to Level 5)**: Multi-tiered clearance matrix restricting raw PII visibility by rank.
5. **Strict 2-Factor Authentication (RFC 6238 TOTP)**: Production air-gapped 2FA compatible with Google Authenticator, Microsoft Authenticator, and Authy.
6. **Multi-Page Judicial MoM PDF Generator**: Exports official police reports formatted for court proceedings and leadership review.

---

## 🔑 Default Administrator Credentials

For fresh production deployments, only the **Master Administrator** is seeded. All subsequent officers are provisioned dynamically through the **Officer Directory & Provisioning** tab.

| Parameter | Master Administrator Account |
| :--- | :--- |
| **Email** | `admin@cybercell.gov.in` |
| **Username** | `admin` |
| **Security Passphrase** | `CyberCell@2026` |
| **Clearance Level** | **Level 5 — Administrator (Super Clearance)** |
| **Badge ID** | `POL-1001` |
| **Base32 2FA Secret Key** | `JBSWY3DPEHPK3PXP` |

### 📲 Setting Up 2FA on Google Authenticator / Authy:
1. Open **Google Authenticator** or **Authy** on your mobile device.
2. Select **Add Account (+)** → **Enter a setup key**.
3. Account name: `State Cyber Cell (admin@cybercell.gov.in)`
4. Key: `JBSWY3DPEHPK3PXP`
5. Type of key: **Time-based (TOTP)**
6. Click **Add**. The app will now generate a dynamic 6-digit rolling security code every 30 seconds.

---

## 💻 Installation & Configuration

### Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.10 or higher (`python --version` or `python3 --version`)
- **Git**: (`git --version`)

---

### 🪟 Windows Setup Guide

#### Option A: One-Click Installer (Recommended)
1. Double-click **`setup.bat`** in the project directory.
2. The script will automatically verify Python, install all Node.js and Python dependencies, run the cryptographic test suite, and offer to launch the platform.
3. To start the application at any time, run:
   ```cmd
   run.bat
   ```
   Or:
   ```powershell
   npm run start:full
   ```

#### Option B: Manual Step-by-Step Installation (PowerShell / CMD)
1. **Install Node & Python dependencies**:
   ```powershell
   # Root & Microservices
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   cd python-service && pip install -r requirements.txt && cd ..
   ```
2. **Run Integrity & RBAC Tests**:
   ```powershell
   npm test
   ```
3. **Launch All Services**:
   ```powershell
   npm run start:full
   ```
4. Access the web terminal at: **`http://localhost:5173`**

---

### 🍎 macOS & Linux Setup Guide

#### Option A: Automated Script
1. Open Terminal in the project root and make the scripts executable:
   ```bash
   chmod +x setup.sh run.sh
   ```
2. Run the installer:
   ```bash
   ./setup.sh
   ```
3. Launch all microservices:
   ```bash
   ./run.sh
   ```

#### Option B: Manual Step-by-Step Installation
1. **Setup Python Virtual Environment**:
   ```bash
   cd python-service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install fastapi uvicorn pydantic python-multipart requests
   deactivate
   cd ..
   ```
2. **Install Node.js packages**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```
3. **Run Self-QA Test Suite**:
   ```bash
   node backend/test_qa_suite.js
   ```
4. **Launch All 3 Microservices**:
   ```bash
   npm run start:full
   ```
5. Open your browser and navigate to: **`http://localhost:5173`**

---

## 🐳 Docker Deployment (Clustered & Containerized)

To deploy the entire stack inside isolated Docker containers:

```bash
# Build and boot all containers in background
npm run docker:up

# To stop containers
npm run docker:down
```

The stack exposes:
- **Frontend UI**: `http://localhost:5173`
- **Node.js Express Backend API**: `http://localhost:5000`
- **Python AI Microservice**: `http://localhost:8000`

---

## ⚙️ Environment Variables (`.env`)

Configuration parameters are managed in `.env` (a template is provided in `.env.example`):

```env
# Server & Security
PORT=5000
NODE_ENV=production
JWT_SECRET=cyber_cell_secret_jwt_key_2026_police
PYTHON_SERVICE_URL=http://localhost:8000

# Persistence (Uses local cryptographic JSON ledger by default; MongoDB optional)
# MONGODB_URI=mongodb://localhost:27017/cyber_cell_db

# Local Audio Storage Directory
AUDIO_STORAGE_PATH=./storage/audio

# Python AI Microservice (Whisper & Presidio)
PYTHON_PORT=8000
WHISPER_MODEL_SIZE=base
DEVICE=cpu
COMPUTE_TYPE=int8

# Frontend API Gateway Target
VITE_API_BASE_URL=http://localhost:5000/api
```

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

Execute the cryptographic verification suite at any time:

```bash
npm test
```

Expected Output:
```text
==================================================
  STATE CYBER CELL MO M TOOL — SELF-QA TEST SUITE
==================================================

[TEST 1] Hash Chain Integrity Verification...
✅ TEST 1 PASSED: Hash Chain unbroken with 4 cryptographic entries.

[TEST 2] RBAC Role-Based Redaction Gating...
✅ TEST 2 PASSED: Auditor role strictly blocked from raw PII transcript.

[TEST 3] Action Item Edit & Record Approval Locking...
✅ TEST 3 PASSED: Record approved, locked, and registered to hash chain!

==================================================
  ALL BACKEND & HASH CHAIN QA CHECKS PASSED 100%
==================================================
```

---

## 🔒 Security & Data Integrity Guarantees

1. **Zero Cloud Ingestion**: All audio transcription and PII redaction occur entirely on localhost. No recording, transcript, or personal identifier is transmitted over the internet.
2. **Tamper Detection**: Any direct alteration to `auditLogs.json` breaks the SHA-256 hash sequence and is instantly flagged during system startup and verification.
3. **Air-Gapped 2FA**: The RFC 6238 TOTP engine operates on local mathematical time synchronization with zero external API calls.
