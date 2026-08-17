const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "cyber_cell_secret_jwt_key_2026_police";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Demo fallback: default to demo user if no token provided
  if (!token) {
    req.user = {
      id: "usr-2",
      username: "investigator_shinde",
      role: req.headers["x-demo-role"] || "INVESTIGATOR", // DEMO AFFORDANCE: Header role override for live testing
      name: "Inspector Shinde"
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired session token" });
    
    // DEMO AFFORDANCE: Allow demo navbar dropdown header to override active role for presentation testing
    if (req.headers["x-demo-role"]) {
      user.role = req.headers["x-demo-role"];
    }
    
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const activeRole = req.user ? req.user.role : "AUDITOR";
    if (!allowedRoles.includes(activeRole)) {
      return res.status(403).json({
        error: "Access Denied: Insufficient Clearance Level",
        requiredRoles: allowedRoles,
        userRole: activeRole
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
