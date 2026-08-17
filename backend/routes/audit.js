const express = require("express");
const router = express.Router();
const { auditLogs, createAuditEntry, verifyHashChainIntegrity } = require("../db/store");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// Get Audit Logs Ledger (Allowed: ADMIN, AUDITOR)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "AUDITOR"),
  (req, res) => {
    const integrityCheck = verifyHashChainIntegrity();
    res.json({
      status: "success",
      totalLogs: auditLogs.length,
      integrityCheck,
      auditLogs
    });
  }
);

// Verify Cryptographic Hash Chain Integrity
router.get(
  "/verify",
  authenticateToken,
  authorizeRoles("ADMIN", "AUDITOR"),
  (req, res) => {
    const user = req.user || { id: "usr-demo", username: "auditor_general", role: "AUDITOR" };
    createAuditEntry(
      user.id,
      user.username,
      user.role,
      "VERIFY_AUDIT_LEDGER",
      "ledger-root",
      { note: "Cryptographic SHA-256 Hash Integrity Audit Initiated" }
    );

    const integrityResult = verifyHashChainIntegrity();
    res.json({
      status: "success",
      integrity: integrityResult
    });
  }
);

// Helper function to process custom audit log entry
function handleLogEvent(req, res) {
  const { action, resourceId, details } = req.body;
  const user = req.user || { id: "usr-demo", username: "demo_officer", role: "INVESTIGATOR" };

  const entry = createAuditEntry(
    user.id,
    user.username,
    user.role,
    action || "USER_INTERACTION",
    resourceId || "general",
    details || {}
  );

  res.json({ status: "success", entry });
}

// Support both /log and /audit-logs/log routes to prevent any 404 errors!
router.post("/log", authenticateToken, handleLogEvent);
router.post("/audit-logs/log", authenticateToken, handleLogEvent);

module.exports = router;
