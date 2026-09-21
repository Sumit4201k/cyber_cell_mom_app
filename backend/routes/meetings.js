const express = require("express");
const router = express.Router();
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { meetings, createAuditEntry, saveMeetingsToFile, ROLE_LEVELS, ENTITY_PERMISSIONS } = require("../db/store");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const Meeting = require("../models/Meeting");
const { isMongoConnected, syncMeetingToMongo } = require("../db/mongo");
const { saveAudioFile, getAudioFilePath } = require("../services/storageService");

const upload = multer({ storage: multer.memoryStorage() });

// Smart NLP Title Classifier & Semantic Extractor Engine
function extractDynamicTitleFromSpeech(transcript, defaultId) {
  if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
    return `Cyber Crime Investigation Record (${defaultId})`;
  }

  const cleanText = transcript.trim();
  const lower = cleanText.toLowerCase();

  // 1. Spoken FIR or Cyber Ticket Matcher
  const firMatch = cleanText.match(/\bFIR[-\s]?\d{4}[-\s]?\d{4,6}\b/i) || cleanText.match(/\bFIR\s*\d{4,6}\b/i);
  const ticketMatch = cleanText.match(/\b(?:CY|CYBER|NCRB|NCRP)[-\s]?\d{4}[-\s]?\d{4,6}\b/i) || cleanText.match(/\bCY[-\s]?\d{4,6}\b/i);
  let caseRef = firMatch ? firMatch[0].replace(/\s+/g, '-').toUpperCase() : ticketMatch ? ticketMatch[0].replace(/\s+/g, '-').toUpperCase() : defaultId;

  // 2. Offense Category Classifier
  let primaryTopic = "";
  if (lower.includes("lockbit") || lower.includes("ransomware")) {
    primaryTopic = "LockBit Ransomware Breach Response";
  } else if (lower.includes("sim") || lower.includes("swap") || lower.includes("mule")) {
    primaryTopic = "SIM-Swapping & Banking Fraud";
  } else if (lower.includes("deepfake") || lower.includes("extortion") || lower.includes("blackmail") || lower.includes("video")) {
    primaryTopic = "Deepfake & Cyber Extortion Threat";
  } else if (lower.includes("instagram") || lower.includes("fake profile") || lower.includes("stalking")) {
    primaryTopic = "Social Media Extortion Investigation";
  } else if (lower.includes("phishing") || lower.includes("fake bank") || lower.includes("customer care")) {
    primaryTopic = "Phishing Syndicate & Portal Fraud";
  } else if (lower.includes("crypto") || lower.includes("usdt") || lower.includes("wallet") || lower.includes("blockchain")) {
    primaryTopic = "Crypto Wallet Seizure & Tracing";
  } else if (lower.includes("whatsapp") || lower.includes("telegram") || lower.includes("apk") || lower.includes("malware")) {
    primaryTopic = "Mobile Malware & Threat Analysis";
  } else if (lower.includes("utility") || lower.includes("electricity") || lower.includes("bill")) {
    primaryTopic = "Utility Bill Scam & Fraud Analysis";
  } else if (lower.includes("upi") || lower.includes("credit card") || lower.includes("otp")) {
    primaryTopic = "UPI & Financial Fraud Investigation";
  }

  // 3. Target / Entity Extractor
  let targetDetail = "";
  if (lower.includes("hospital") || lower.includes("health")) targetDetail = "on Hospital Infrastructure";
  else if (lower.includes("college") || lower.includes("student")) targetDetail = "Targeting Student Victim";
  else if (lower.includes("senior citizen") || lower.includes("elderly")) targetDetail = "Targeting Senior Citizens";
  else if (lower.includes("bank") || lower.includes("account")) targetDetail = "Beneficiary Account Freeze";

  // 4. Synthesize Smart Title
  if (primaryTopic) {
    if (targetDetail && !primaryTopic.includes("Hospital")) {
      return `${primaryTopic} (${targetDetail}) [${caseRef}]`;
    }
    return `${primaryTopic} (${caseRef})`;
  }

  // 5. Keyword Key-Phrase Summarizer
  const importantWords = cleanText
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !["this", "that", "with", "from", "have", "under", "over", "were", "been", "they", "their", "meeting", "started", "inspector", "constable", "officer", "briefing", "reviewing", "case"].includes(w.toLowerCase()));

  const keyWordsStr = importantWords.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  return `${keyWordsStr || "Cyber Crime Inquest"} (${caseRef})`;
}

// Regex-based PII Extractor & Redactor for direct text payloads
function processTranscriptWithRegex(transcript, user) {
  const cleanText = (transcript || "").trim();
  if (!cleanText) {
    return {
      redactedText: "",
      entities: [],
      agenda: [],
      decisions: [],
      actionItems: []
    };
  }
  
  const entities = [];
  const aadhaarMatches = listMatches(cleanText, /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, "AADHAAR_NUMBER");
  const panMatches = listMatches(cleanText, /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, "PAN_NUMBER");
  const ifscMatches = listMatches(cleanText, /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, "IFSC_CODE");
  const bankMatches = listMatches(cleanText, /\b(?:account|acc|a\/c|a\/c\s*no\.?)[\s#:]*(\d{9,18})\b|\b\d{11,18}\b/gi, "BANK_ACCOUNT");
  const firMatches = listMatches(cleanText, /\bFIR-\d{4}-\d{4,6}\b|\bFIR\s*\d{4,6}\b/gi, "FIR_ID");
  const badgeMatches = listMatches(cleanText, /\b(?:POL|ISP|DSP|CONST|INSP|SI|ASI|ACP|DCP)[-\s]?\d{4,6}\b/gi, "BADGE_ID");
  const ticketMatches = listMatches(cleanText, /\b(?:CY|CYBER|NCRB|NCRP)[-\s]?\d{4}[-\s]?\d{4,6}\b|\bCY-\d{4,6}\b/gi, "CYBER_TICKET");
  const phoneMatches = listMatches(cleanText, /(?:\+91[\-\s]?)?[6789]\d{9}\b|\+?\d{1,3}[\s-]?\d{10}\b/g, "PHONE_NUMBER");
  const emailMatches = listMatches(cleanText, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, "EMAIL_ADDRESS");

  entities.push(
    ...aadhaarMatches.entities,
    ...panMatches.entities,
    ...ifscMatches.entities,
    ...bankMatches.entities,
    ...firMatches.entities,
    ...badgeMatches.entities,
    ...ticketMatches.entities,
    ...phoneMatches.entities,
    ...emailMatches.entities
  );

  // Replace tokens backwards to preserve character indices
  const sorted = [...entities].sort((a, b) => b.start - a.start);
  const chars = cleanText.split('');
  for (const ent of sorted) {
    chars.splice(ent.start, ent.end - ent.start, `[${ent.entity_type}]`);
  }
  const redactedText = chars.join('');

  // Clean timestamp prefixes and extract Agenda directly from real sentences
  const cleanSpeechText = cleanText.replace(/\[\d+(?:\.\d+)?s\s*->\s*\d+(?:\.\d+)?s\]\s*/g, "");
  const rawSentences = cleanSpeechText.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 3);
  const sentences = rawSentences.filter(s => !/^(?:hello|hi|test|testing|okay|ok|yes|no|mic\s*check)[\s,.]*$/i.test(s) && s.length > 6);
  const activeSentences = sentences.length > 0 ? sentences : rawSentences;

  let agenda = [];
  if (activeSentences.length >= 3) {
    agenda = [
      `Review of Incident: ${activeSentences[0]}`,
      `Technical Evidence Analysis: ${activeSentences[1]}`,
      `Legal Action & Notice Issuance: ${activeSentences[activeSentences.length - 1]}`
    ];
  } else if (activeSentences.length === 2) {
    agenda = [
      `Incident Investigation: ${activeSentences[0]}`,
      `Follow-up Directives: ${activeSentences[1]}`
    ];
  } else if (activeSentences.length === 1) {
    agenda = [
      `Case Investigation: ${activeSentences[0]}`,
      "Technical Log Correlation"
    ];
  } else {
    agenda = ["Case Record Ingestion & Investigation"];
  }

  // Extract Decisions from actual keywords or sentences
  const lower = cleanText.toLowerCase();
  let decisions = [];
  if (lower.includes("freeze") || lower.includes("bank") || lower.includes("account")) {
    decisions.push("Issue Section 91 CrPC emergency notice to freeze beneficiary bank accounts");
  }
  if (lower.includes("cdr") || lower.includes("imei") || lower.includes("telecom") || lower.includes("ip")) {
    decisions.push("Subpoena CDR, IPDR, and subscriber details from telecom compliance team under Section 91 CrPC");
  }
  if (lower.includes("crypto") || lower.includes("wallet")) {
    decisions.push("Obtain court injunction to freeze suspect crypto wallet address");
  }
  if (decisions.length === 0) {
    if (activeSentences.length > 0) {
      decisions.push(`Proceed with investigation directives: ${activeSentences[0]}`);
    } else {
      decisions.push("Initiate formal inquiry and preserve electronic evidence");
    }
  }

  // Action Items Matrix derived from real sentences
  const actionItems = [];
  if (activeSentences.length > 0) {
    actionItems.push({
      id: `act-${Date.now()}-1`,
      task: `Execute directive: ${activeSentences[0]}`,
      owner: user.username || "Investigating Officer",
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: "PENDING"
    });
    if (activeSentences.length > 1) {
      actionItems.push({
        id: `act-${Date.now()}-2`,
        task: `Follow up on evidence: ${activeSentences[1]}`,
        owner: user.username || "Cyber Analyst",
        deadline: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        status: "IN_PROGRESS"
      });
    }
  } else {
    actionItems.push({
      id: `act-${Date.now()}-1`,
      task: "Verify case details and preserve forensic evidence",
      owner: user.username || "Investigating Officer",
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: "PENDING"
    });
  }

  return {
    redactedText,
    entities,
    agenda,
    decisions,
    actionItems
  };
}

function listMatches(text, regex, type) {
  const entities = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    entities.push({
      entity_type: type,
      start: m.index,
      end: m.index + m[0].length,
      value: m[0],
      score: 1.0
    });
  }
  return { entities };
}

// Get all meeting records (Role-gated data masking & entity clearance evaluation)
router.get("/", authenticateToken, async (req, res) => {
  const role = req.user?.role || "INVESTIGATOR";
  const userLevel = ROLE_LEVELS[role] ? ROLE_LEVELS[role].level : 2;

  let currentMeetings = meetings;
  if (isMongoConnected()) {
    try {
      const dbMeetings = await Meeting.find({}).sort({ createdAt: -1 }).lean();
      if (dbMeetings && dbMeetings.length > 0) {
        currentMeetings = dbMeetings;
      }
    } catch (dbErr) {
      console.warn("MongoDB meetings fetch note:", dbErr.message);
    }
  }

  const sanitizedMeetings = currentMeetings.map((m) => {
    if (role === "AUDITOR") {
      return {
        ...m,
        rawTranscript: "[RESTRICTED - AUDITOR CLEARANCE LEVEL 0]",
        entitiesFound: (m.entitiesFound || []).map(ent => ({
          ...ent,
          value: "[RESTRICTED]",
          canUnmask: false,
          requiredClearance: ENTITY_PERMISSIONS[ent.entity_type]?.clearance || "Level 4 (INVESTIGATOR+)",
          riskLevel: ENTITY_PERMISSIONS[ent.entity_type]?.risk || "HIGH"
        }))
      };
    }

    // Annotate entities with real-time clearance permissions for the current role
    const annotatedEntities = (m.entitiesFound || []).map(ent => {
      const perm = ENTITY_PERMISSIONS[ent.entity_type];
      const allowed = perm ? perm.allowedRoles.includes(role) || userLevel >= perm.minLevel : userLevel >= 4;
      return {
        ...ent,
        canUnmask: allowed,
        requiredClearance: perm?.clearance || "Level 4 (INVESTIGATOR+)",
        riskLevel: perm?.risk || "MEDIUM",
        minLevel: perm?.minLevel || 4
      };
    });

    return {
      ...m,
      audioUrl: m.audioUrl || (m.audioStorage ? `/api/meetings/${m.id}/audio` : undefined),
      entitiesFound: annotatedEntities
    };
  });

  res.json({ status: "success", count: sanitizedMeetings.length, meetings: sanitizedMeetings });
});

// Upload & Process Audio Recording (Proxies directly to Python faster-whisper / Presidio ML microservice)
const parseFormOrJson = (req, res, next) => {
  if (req.is && req.is('multipart/form-data')) {
    upload.single("audio")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ status: "error", message: `Multipart upload error: ${err.message}` });
      }
      next();
    });
  } else {
    next();
  }
};

router.post("/upload", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER", "TRAINEE"), parseFormOrJson, async (req, res) => {
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };
  const customTitle = req.body?.title;
  let customTranscript = req.body?.customTranscript;
  const createdBy = req.body?.createdBy || user.username || "Investigating Officer";
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

  const hasAudioFile = !!(req.file && req.file.buffer && req.file.buffer.length > 0);
  const hasCustomTranscript = !!(customTranscript && customTranscript.trim().length > 0);

  if (!hasAudioFile && !hasCustomTranscript) {
    return res.status(400).json({
      status: "error",
      message: "No audio file or transcript provided for processing. Please provide a valid audio file (.wav, .mp3, .m4a) or direct transcript text."
    });
  }

  let pythonResponse = null;

  // 1. Communicate with Python ML Service (faster-whisper CPU INT8 + Presidio PII + MoM Structuring)
  try {
    const formData = new FormData();

    if (hasAudioFile) {
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname || "meeting_audio.wav",
        contentType: req.file.mimetype || "audio/wav"
      });
    }

    if (hasCustomTranscript) {
      formData.append("customTranscript", customTranscript.trim());
    }

    if (customTitle) {
      formData.append("title", customTitle.trim());
    }

    if (createdBy) {
      formData.append("createdBy", createdBy.trim());
    }

    const language = req.body?.language;
    if (language) {
      formData.append("language", language.trim());
    }

    const pyRes = await fetch(`${pythonServiceUrl}/process-meeting`, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
      timeout: 300000 // 5 minutes timeout for CPU transcription of long audio recordings
    });

    const pyData = await pyRes.json().catch(() => null);

    if (!pyRes.ok) {
      const errorMsg = pyData?.message || pyData?.error || `Python ML microservice returned HTTP ${pyRes.status}`;
      return res.status(pyRes.status || 500).json({
        status: "error",
        message: errorMsg
      });
    }

    pythonResponse = pyData;
    console.log(`[Python ML Service] Successfully processed meeting via ${pythonServiceUrl}`);
  } catch (pyErr) {
    console.error(`[Python ML Service] Unreachable or failed: ${pyErr.message}`);
    return res.status(503).json({
      status: "error",
      message: `AI/ML Microservice is offline or unreachable: ${pyErr.message}. Ensure python-service is active on port 8000.`
    });
  }

  const newId = `mtg-${Date.now().toString().slice(-4)}`;
  let extractedTitle = customTitle?.trim();
  let aiResult;

  if (pythonResponse && pythonResponse.status === "success") {
    customTranscript = pythonResponse.raw_transcript || customTranscript;
    if (!extractedTitle && pythonResponse.mom?.title) {
      extractedTitle = pythonResponse.mom.title;
    }
    aiResult = {
      redactedText: pythonResponse.redacted_transcript || pythonResponse.raw_transcript,
      entities: pythonResponse.entities_found || [],
      agenda: pythonResponse.mom?.agenda || [],
      decisions: pythonResponse.mom?.decisions || [],
      actionItems: (pythonResponse.mom?.action_items || []).map((item, idx) => ({
        id: item.id || `act-${Date.now()}-${idx + 1}`,
        task: item.task,
        owner: item.owner || createdBy,
        deadline: item.deadline || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: item.status || "PENDING"
      }))
    };
  } else {
    if (!extractedTitle) {
      extractedTitle = extractDynamicTitleFromSpeech(customTranscript, newId);
    }
    aiResult = processTranscriptWithRegex(customTranscript, user);
  }

  // Save audio file locally to file-based storage if present
  let audioStorageMeta = null;
  if (hasAudioFile) {
    audioStorageMeta = saveAudioFile(
      req.file.buffer,
      newId,
      req.file.originalname || "meeting_audio.wav",
      req.file.mimetype || "audio/wav"
    );
  }

  const newMeeting = {
    id: newId,
    title: extractedTitle || `Meeting Record (${newId})`,
    caseFir: (extractedTitle && extractedTitle.match(/FIR[-\s]?\d{4}[-\s]?\d{4,6}/i)) ? extractedTitle.match(/FIR[-\s]?\d{4}[-\s]?\d{4,6}/i)[0] : undefined,
    date: new Date().toISOString().split("T")[0],
    createdBy: createdBy,
    status: "DRAFT_PENDING_REVIEW",
    audioStorage: audioStorageMeta,
    audioUrl: audioStorageMeta ? `/api/meetings/${newId}/audio` : undefined,
    rawTranscript: customTranscript || "",
    redactedTranscript: aiResult.redactedText || customTranscript || "",
    entitiesFound: aiResult.entities || [],
    agenda: aiResult.agenda || [],
    decisions: aiResult.decisions || [],
    action_items: aiResult.actionItems || [],
    mom: {
      title: extractedTitle,
      summary: pythonResponse?.mom?.summary || `Meeting briefing conducted on ${new Date().toISOString().split("T")[0]} by Officer ${createdBy}.`,
      incident_type: pythonResponse?.mom?.incident_type || "Cyber Crime Investigation",
      severity: pythonResponse?.mom?.severity || "HIGH",
      attendees: pythonResponse?.mom?.attendees || [createdBy],
      agenda: aiResult.agenda || [],
      decisions: aiResult.decisions || [],
      action_items: aiResult.actionItems || []
    }
  };

  // Persist to MongoDB if connected
  if (isMongoConnected()) {
    try {
      await syncMeetingToMongo(newMeeting);
      console.log(`[MONGODB] Meeting record ${newMeeting.id} ("${newMeeting.title}") saved to MongoDB.`);
    } catch (dbErr) {
      console.warn("MongoDB Meeting save warning:", dbErr.message);
    }
  }

  meetings.unshift(newMeeting);
  saveMeetingsToFile();

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "MEETING_UPLOADED",
    newMeeting.id,
    {
      title: newMeeting.title,
      engine: pythonResponse ? "faster-whisper-python-ml" : "node-regex-nlp",
      audioSaved: !!audioStorageMeta,
      audioHash: audioStorageMeta?.sha256Hash
    }
  );

  res.json({
    status: "success",
    meeting: newMeeting,
    engine: pythonResponse ? "faster-whisper-python-ml" : "node-regex-nlp"
  });
});

// Stream Meeting Audio Recording (With HTTP 206 Range support for audio player)
router.get("/:id/audio", (req, res) => {
  const { id } = req.params;
  const meeting = meetings.find((m) => m.id === id);

  if (!meeting || !meeting.audioStorage) {
    return res.status(404).json({ status: "error", message: "No audio recording file is associated with this meeting record." });
  }

  const audioPath = getAudioFilePath(meeting.audioStorage.storagePath || meeting.audioStorage.fileName);
  if (!audioPath || !fs.existsSync(audioPath)) {
    return res.status(404).json({ status: "error", message: "Audio file missing from local storage directory." });
  }

  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(audioPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": meeting.audioStorage.mimeType || "audio/wav"
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": meeting.audioStorage.mimeType || "audio/wav"
    };
    res.writeHead(200, head);
    fs.createReadStream(audioPath).pipe(res);
  }
});

// Update Case Title (Allowed: ADMIN, INVESTIGATOR)
router.patch("/:id/title", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR"), (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };

  if (!title || !title.trim()) {
    return res.status(400).json({ status: "error", message: "Title cannot be empty" });
  }

  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting file not found" });
  }

  if (meeting.status === "OFFICIALLY_APPROVED") {
    return res.status(400).json({ status: "error", message: "Cannot edit title of an officially approved and locked record." });
  }

  const oldTitle = meeting.title;
  meeting.title = title.trim();
  saveMeetingsToFile();
  syncMeetingToMongo(meeting);

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "UPDATE_CASE_TITLE",
    meeting.id,
    { oldTitle, newTitle: meeting.title }
  );

  res.json({ status: "success", meeting });
});

// Update Agenda Topics (Allowed: ADMIN, INVESTIGATOR, ANALYST)
router.patch("/:id/agenda", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR", "ANALYST"), (req, res) => {
  const { id } = req.params;
  const { agenda } = req.body;
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };

  if (!Array.isArray(agenda)) {
    return res.status(400).json({ status: "error", message: "agenda must be an array" });
  }

  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting record not found" });
  }

  if (meeting.status === "OFFICIALLY_APPROVED") {
    return res.status(400).json({ status: "error", message: "Cannot edit agenda of an officially approved and locked record." });
  }

  meeting.agenda = agenda;
  saveMeetingsToFile();
  syncMeetingToMongo(meeting);

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "UPDATE_AGENDA",
    meeting.id,
    { agendaCount: agenda.length }
  );

  res.json({ status: "success", meeting });
});

// Update Decisions Taken (Allowed: ADMIN, INVESTIGATOR, ANALYST, FIELD_OFFICER)
router.patch("/:id/decisions", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER"), (req, res) => {
  const { id } = req.params;
  const { decisions } = req.body;
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };

  if (!Array.isArray(decisions)) {
    return res.status(400).json({ status: "error", message: "decisions must be an array" });
  }

  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting record not found" });
  }

  if (meeting.status === "OFFICIALLY_APPROVED") {
    return res.status(400).json({ status: "error", message: "Cannot edit decisions of an officially approved and locked record." });
  }

  meeting.decisions = decisions;
  saveMeetingsToFile();
  syncMeetingToMongo(meeting);

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "UPDATE_DECISIONS",
    meeting.id,
    { decisionsCount: decisions.length }
  );

  res.json({ status: "success", meeting });
});

// Update Action Items Matrix (Allowed: ADMIN, INVESTIGATOR, ANALYST, FIELD_OFFICER, TRAINEE)
router.patch("/:id/action-items", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR", "ANALYST", "FIELD_OFFICER", "TRAINEE"), (req, res) => {
  const { id } = req.params;
  const { action_items } = req.body;
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };

  if (!Array.isArray(action_items)) {
    return res.status(400).json({ status: "error", message: "action_items must be an array" });
  }

  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting record not found" });
  }

  if (meeting.status === "OFFICIALLY_APPROVED") {
    return res.status(400).json({ status: "error", message: "Cannot edit action items of an officially approved and locked record." });
  }

  meeting.action_items = action_items;
  saveMeetingsToFile();
  syncMeetingToMongo(meeting);

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "UPDATE_ACTION_ITEMS",
    meeting.id,
    { itemCount: action_items.length }
  );

  res.json({ status: "success", meeting });
});

// Approve & Lock MoM Record (Allowed: ADMIN, INVESTIGATOR)
router.post("/:id/approve", authenticateToken, authorizeRoles("ADMIN", "INVESTIGATOR"), (req, res) => {
  const { id } = req.params;
  const user = req.user || { id: "usr-demo", username: "investigator_shinde", role: "INVESTIGATOR" };

  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting record not found" });
  }

  meeting.status = "OFFICIALLY_APPROVED";
  meeting.approvedBy = user.username || "Investigating Officer POL-8842";
  saveMeetingsToFile();
  syncMeetingToMongo(meeting);

  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "RECORD_APPROVED",
    meeting.id,
    { status: "OFFICIALLY_APPROVED", title: meeting.title, approvedBy: meeting.approvedBy }
  );

  res.json({ status: "success", meeting });
});

// Reset / Wipe All Meeting Records (Admin / Clean Initialization)
router.post("/reset-all", authenticateToken, authorizeRoles("ADMIN"), async (req, res) => {
  const { clearAllMeetings } = require("../db/store");
  clearAllMeetings();

  if (isMongoConnected()) {
    try {
      const Meeting = require("../models/Meeting");
      await Meeting.deleteMany({});
    } catch (e) {}
  }

  const user = req.user || { id: "usr-1", username: "admin_pawar", role: "ADMIN" };
  createAuditEntry(
    user.id,
    user.username,
    user.role,
    "MEETINGS_WIPED_CLEAN",
    "all",
    { message: "All case meetings wiped clean to zero state." }
  );

  res.json({ status: "success", message: "All meeting records wiped clean.", count: 0, meetings: [] });
});

// Stream / Download Meeting Audio Recording File
router.get("/:id/audio", (req, res) => {
  const { id } = req.params;
  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ status: "error", message: "Meeting record not found." });
  }

  const storagePath = meeting.audioStorage?.storagePath || meeting.audioStorage?.fileName;
  let filePath = getAudioFilePath(storagePath);

  // If not in primary storage, check samples directory if originalName matches
  if (!filePath && meeting.audioStorage?.originalName) {
    const sampleCandidate = path.join(__dirname, "../../samples", meeting.audioStorage.originalName);
    if (fs.existsSync(sampleCandidate)) {
      filePath = sampleCandidate;
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({
      status: "error",
      message: "Audio recording file is unavailable or was not saved on server disk."
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const mimeType = meeting.audioStorage?.mimeType || (filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

module.exports = router;
