const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Ensure data persistence directory exists safely
const DATA_DIR = path.join(__dirname, "../data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only file system (e.g. Vercel Serverless Functions) - maintain state cleanly in memory!
}

const MEETINGS_FILE = path.join(DATA_DIR, "meetings.json");
const AUDIT_FILE = path.join(DATA_DIR, "auditLogs.json");

// Cryptographic Ledger Genesis Hash
const GENESIS_HASH = "GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000";

// Initial Seed Meetings with 100% Unique Police Incident Titles & Dynamic Audio Durations
const initialMeetings = [
  {
    id: "mtg-101",
    title: "SIM-Swapping & Mobile Banking Fraud Review (FIR-2026-9941)",
    date: "2026-08-16",
    createdBy: "Investigating Officer POL-8842",
    duration: 145,
    status: "DRAFT_PENDING_REVIEW",
    rawTranscript: "Inspector Shinde: Briefing on SIM swapping incident FIR-2026-9941. Target victim lost 4.2 Lakhs via unauthorized porting. Cyber Ticket CY-2026-8812 assigned to Analyst ISP-1029.",
    redactedTranscript: "Inspector Shinde: Briefing on SIM swapping incident [FIR: FIR-2026-9941]. Target victim lost 4.2 Lakhs via unauthorized porting. Cyber Ticket [TICKET: CY-2026-8812] assigned to Analyst [BADGE: ISP-1029].",
    entitiesFound: [
      { entity_type: "FIR_ID", value: "FIR-2026-9941" },
      { entity_type: "CYBER_TICKET", value: "CY-2026-8812" },
      { entity_type: "BADGE_ID", value: "ISP-1029" }
    ],
    agenda: ["SIM Swapping Fraud Attack Vector", "CDR Packet Log Analysis", "Nodal Officer Subpoena"],
    decisions: ["Issue Section 91 CrPC notice to telecom operator", "Freeze linked mule bank account"],
    action_items: [
      { id: "act-1", task: "Issue Section 91 CrPC notice to bank nodal officer", owner: "Investigating Officer POL-8842", deadline: "2026-08-17", status: "PENDING" },
      { id: "act-2", task: "Extract packet trace for Ticket CY-2026-8812", owner: "Cyber Analyst ISP-1029", deadline: "2026-08-18", status: "IN_PROGRESS" }
    ]
  },
  {
    id: "mtg-102",
    title: "Phishing Syndicate & Crypto Wallet Seizure (FIR-2026-8812)",
    date: "2026-08-15",
    createdBy: "Senior Inspector DSP-4021",
    duration: 112,
    status: "OFFICIALLY_APPROVED",
    rawTranscript: "DSP Deshmukh: Reviewing phishing scam targeting senior citizens. Over 18 Lakhs funneled to USDT crypto wallet. Requesting immediate freeze from Binance compliance.",
    redactedTranscript: "DSP Deshmukh: Reviewing phishing scam targeting senior citizens. Over 18 Lakhs funneled to USDT crypto wallet [CRYPTO_ADDR]. Requesting immediate freeze from Binance compliance.",
    entitiesFound: [
      { entity_type: "FIR_ID", value: "FIR-2026-8812" },
      { entity_type: "BADGE_ID", value: "DSP-4021" }
    ],
    agenda: ["Fake Bank Utility Portal Phishing", "Blockchain Ledger Tracing", "Mule Account Freezing"],
    decisions: ["Obtain court emergency injunction for crypto freeze", "Dispatch cyber team to suspect tower location"],
    action_items: [
      { id: "act-3", task: "Send formal request to crypto exchange compliance desk", owner: "Senior Inspector DSP-4021", deadline: "2026-08-16", status: "COMPLETED" },
      { id: "act-4", task: "Analyze tower dumps for victim cell towers", owner: "Cyber Analyst ISP-1029", deadline: "2026-08-17", status: "IN_PROGRESS" }
    ]
  },
  {
    id: "mtg-103",
    title: "Ransomware Server Breach & Data Extraction (CY-2026-7734)",
    date: "2026-08-14",
    createdBy: "Technical Lead CONST-5519",
    duration: 188,
    status: "DRAFT_PENDING_REVIEW",
    rawTranscript: "Officer Pawar: Incident response meeting regarding LockBit strain detected on hospital servers. Threat actor demanding 2 BTC. Isolated network subnet at 03:00 AM.",
    redactedTranscript: "Officer Pawar: Incident response meeting regarding LockBit strain detected on hospital servers. Threat actor demanding 2 BTC. Isolated network subnet at 03:00 AM.",
    entitiesFound: [
      { entity_type: "CYBER_TICKET", value: "CY-2026-7734" },
      { entity_type: "BADGE_ID", value: "CONST-5519" }
    ],
    agenda: ["Ransomware Binary Memory Analysis", "Offsite Backup Restoration", "Cert-In Escalation"],
    decisions: ["Do NOT pay ransom under any circumstances", "Restore air-gapped backups"],
    action_items: [
      { id: "act-5", task: "Perform forensic memory dump of infected domain controller", owner: "Technical Lead CONST-5519", deadline: "2026-08-15", status: "IN_PROGRESS" }
    ]
  },
  {
    id: "mtg-104",
    title: "Deepfake Extortion & Telegram Channel Analysis (FIR-2026-5521)",
    date: "2026-08-12",
    createdBy: "Investigating Officer POL-8842",
    duration: 94,
    status: "OFFICIALLY_APPROVED",
    rawTranscript: "Inspector Shinde: Case file FIR-2026-5521 regarding AI deepfake video creation and extortion via Telegram channel. Issued takedown notice under IT Act Section 66E.",
    redactedTranscript: "Inspector Shinde: Case file [FIR: FIR-2026-5521] regarding AI deepfake video creation and extortion via Telegram channel. Issued takedown notice under IT Act Section 66E.",
    entitiesFound: [
      { entity_type: "FIR_ID", value: "FIR-2026-5521" },
      { entity_type: "BADGE_ID", value: "POL-8842" }
    ],
    agenda: ["Synthetic Media Watermark Detection", "Telegram Admin IP Subpoena", "Victim Protection Protocols"],
    decisions: ["Issue Section 91 CrPC notice to Telegram Legal", "Provide digital privacy counseling"],
    action_items: [
      { id: "act-6", task: "Track IP logs received from Telegram compliance officer", owner: "Investigating Officer POL-8842", deadline: "2026-08-14", status: "COMPLETED" }
    ]
  }
];

// Persistent Global In-Memory Cache for Vercel Serverless Functions Cold Starts
if (!globalThis.__CYBER_MEETINGS__) {
  let initial = [...initialMeetings];
  try {
    if (fs.existsSync(MEETINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEETINGS_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) initial = data;
    }
  } catch (e) {}
  globalThis.__CYBER_MEETINGS__ = initial;
}

if (!globalThis.__CYBER_AUDIT_LOGS__) {
  let initialAudit = [];
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      initialAudit = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"));
    }
  } catch (e) {}
  globalThis.__CYBER_AUDIT_LOGS__ = initialAudit;
}

const meetings = globalThis.__CYBER_MEETINGS__;
const auditLogs = globalThis.__CYBER_AUDIT_LOGS__;

function saveMeetingsToFile() {
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(MEETINGS_FILE, JSON.stringify(meetings, null, 2), "utf-8");
    }
  } catch (e) {
    // Read-only filesystem on Vercel Serverless - state maintained cleanly in memory!
  }
}

function saveAuditLogsToFile() {
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogs, null, 2), "utf-8");
    }
  } catch (e) {
    // Read-only filesystem on Vercel Serverless - state maintained cleanly in memory!
  }
}

// Helper: Compute SHA-256 Hash
function computeHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// Helper: Create Cryptographic Audit Entry
function createAuditEntry(userId, username, role, action, resourceId, details = {}) {
  const timestamp = new Date().toISOString();
  const id = `log-${auditLogs.length + 1}`;
  const prevHash = auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].hash : GENESIS_HASH;

  const entryData = {
    id,
    timestamp,
    userId,
    username,
    role,
    action,
    resourceId,
    details,
    prevHash
  };

  const hash = computeHash(entryData);
  const logEntry = { ...entryData, hash };
  auditLogs.push(logEntry);

  saveAuditLogsToFile();
  saveMeetingsToFile();

  return logEntry;
}

// Ensure Genesis Entry exists if log empty
if (auditLogs.length === 0) {
  createAuditEntry("SYSTEM_INIT", "SYSTEM_INIT", "ADMIN", "SYSTEM_BOOTSTRAP", "genesis", {
    message: "State Cyber Cell Cryptographic Audit Ledger Bootstrapped"
  });
}

// Verify Ledger Integrity
function verifyHashChainIntegrity() {
  for (let i = 0; i < auditLogs.length; i++) {
    const current = auditLogs[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : auditLogs[i - 1].hash;

    if (current.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtIndex: i, reason: "Previous Hash Mismatch" };
    }

    const { hash, ...dataToHash } = current;
    const recalculatedHash = computeHash(dataToHash);
    if (recalculatedHash !== hash) {
      return { valid: false, brokenAtIndex: i, reason: "Content Hash Altered" };
    }
  }

  return { valid: true, totalEntries: auditLogs.length };
}

module.exports = {
  meetings,
  auditLogs,
  createAuditEntry,
  verifyHashChainIntegrity,
  saveMeetingsToFile,
  saveAuditLogsToFile
};
