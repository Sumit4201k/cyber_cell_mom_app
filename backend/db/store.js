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

// Initial Seed Meetings: Empty for fresh production start
const initialMeetings = [];

// Persistent Global In-Memory Cache for Vercel Serverless Functions Cold Starts
if (!globalThis.__CYBER_MEETINGS__) {
  let initial = [];
  try {
    if (fs.existsSync(MEETINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEETINGS_FILE, "utf-8"));
      if (Array.isArray(data)) initial = data;
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

// Role Clearance Levels & Hierarchy Map (From Admin Level 5 down to Auditor Level 0)
const ROLE_LEVELS = {
  ADMIN: { level: 5, title: "DCP Administrator (Super Clearance)", badgePrefix: "POL-10" },
  INVESTIGATOR: { level: 4, title: "Senior Inspector (Case Lead)", badgePrefix: "POL-88" },
  ANALYST: { level: 3, title: "Cyber Forensic Analyst", badgePrefix: "ISP-10" },
  FIELD_OFFICER: { level: 2, title: "Sub-Inspector (Field Ops)", badgePrefix: "SI-33" },
  TRAINEE: { level: 1, title: "Constable Trainee (Station Desk)", badgePrefix: "CON-90" },
  AUDITOR: { level: 0, title: "Judicial Oversight / External Auditor", badgePrefix: "AUD-55" }
};

// Granular Entity-Level Access Control Matrix
const ENTITY_PERMISSIONS = {
  AADHAAR_NUMBER: {
    minLevel: 5,
    allowedRoles: ["ADMIN"],
    label: "National ID (Aadhaar 12-Digit)",
    clearance: "Level 5 (ADMIN ONLY - DPDP Act)",
    risk: "CRITICAL"
  },
  PAN_NUMBER: {
    minLevel: 4,
    allowedRoles: ["ADMIN", "INVESTIGATOR"],
    label: "Tax Identity (PAN Number)",
    clearance: "Level 4 (INVESTIGATOR+)",
    risk: "HIGH"
  },
  BANK_ACCOUNT: {
    minLevel: 4,
    allowedRoles: ["ADMIN", "INVESTIGATOR"],
    label: "Financial Beneficiary Account",
    clearance: "Level 4 (INVESTIGATOR+)",
    risk: "HIGH"
  },
  IFSC_CODE: {
    minLevel: 4,
    allowedRoles: ["ADMIN", "INVESTIGATOR"],
    label: "Bank IFSC Code",
    clearance: "Level 4 (INVESTIGATOR+)",
    risk: "MEDIUM"
  },
  CRYPTO_WALLET: {
    minLevel: 3,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST"],
    label: "Cryptocurrency Wallet Hash",
    clearance: "Level 3 (ANALYST+)",
    risk: "MEDIUM"
  },
  EMAIL_ADDRESS: {
    minLevel: 3,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST"],
    label: "Official / Target Email Address",
    clearance: "Level 3 (ANALYST+)",
    risk: "MEDIUM"
  },
  PHONE_NUMBER: {
    minLevel: 2,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER"],
    label: "Mobile / CDR Phone Number",
    clearance: "Level 2 (FIELD_OFFICER+)",
    risk: "LOW"
  },
  BADGE_ID: {
    minLevel: 2,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER"],
    label: "Police Officer Badge Reference",
    clearance: "Level 2 (FIELD_OFFICER+)",
    risk: "LOW"
  },
  FIR_ID: {
    minLevel: 1,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER", "TRAINEE"],
    label: "FIR Case Identification Number",
    clearance: "Level 1 (TRAINEE+)",
    risk: "LOW"
  },
  CYBER_TICKET: {
    minLevel: 1,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER", "TRAINEE"],
    label: "NCRP Cyber Crime Ticket Reference",
    clearance: "Level 1 (TRAINEE+)",
    risk: "LOW"
  },
  PERSON: {
    minLevel: 3,
    allowedRoles: ["ADMIN", "INVESTIGATOR", "ANALYST"],
    label: "Citizen / Witness Name",
    clearance: "Level 3 (ANALYST+)",
    risk: "MEDIUM"
  }
};

// Official Police User Directory & Role Clearance Map (Level 5 down to Level 0)
const users = [
  { id: "usr-1", username: "admin_pawar", role: "ADMIN", clearanceLevel: 5, name: "DCP Pawar (Administrator)", badgeId: "POL-1001", department: "Cyber Command & Control" },
  { id: "usr-2", username: "investigator_shinde", role: "INVESTIGATOR", clearanceLevel: 4, name: "Inspector Shinde", badgeId: "POL-8842", department: "Financial Crimes Division" },
  { id: "usr-3", username: "analyst_patil", role: "ANALYST", clearanceLevel: 3, name: "Analyst Patil", badgeId: "ISP-1029", department: "Digital Forensics & Malware Lab" },
  { id: "usr-4", username: "subinspector_rao", role: "FIELD_OFFICER", clearanceLevel: 2, name: "Sub-Inspector Rao", badgeId: "SI-3391", department: "Tactical Field Interception Unit" },
  { id: "usr-5", username: "trainee_kamble", role: "TRAINEE", clearanceLevel: 1, name: "Constable Trainee Kamble", badgeId: "CON-9021", department: "Station Inward & Data Entry" },
  { id: "usr-6", username: "auditor_deshmukh", role: "AUDITOR", clearanceLevel: 0, name: "State Auditor Deshmukh", badgeId: "AUD-5520", department: "Judicial & Internal Affairs Oversight" }
];

module.exports = {
  users,
  ROLE_LEVELS,
  ENTITY_PERMISSIONS,
  meetings,
  auditLogs,
  createAuditEntry,
  verifyHashChainIntegrity,
  saveMeetingsToFile,
  saveAuditLogsToFile
};
