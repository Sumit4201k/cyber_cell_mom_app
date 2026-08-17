const { createAuditEntry } = require("../db/store");

function auditLogMiddleware(actionName) {
  return (req, res, next) => {
    const user = req.user || { id: "anonymous", username: "guest", role: "GUEST" };
    const resourceId = req.params.id || req.body.meetingId || "general";
    
    // Log access event
    createAuditEntry(
      user.id,
      user.username,
      user.role,
      actionName,
      resourceId,
      { path: req.originalUrl, method: req.method }
    );
    
    next();
  };
}

module.exports = { auditLogMiddleware };
