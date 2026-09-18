const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const { users, ROLE_LEVELS, ENTITY_PERMISSIONS, createAuditEntry } = require("../db/store");

const JWT_SECRET = process.env.JWT_SECRET || "cyber_cell_secret_jwt_key_2026_police";

// Generate MFA TOTP secret for demo user
const mfaSecret = speakeasy.generateSecret({ name: "State Cyber Cell" });

// Get Police Clearance Matrix & Role Directory
router.get("/clearance-matrix", (req, res) => {
  res.json({
    status: "success",
    roleLevels: ROLE_LEVELS,
    entityPermissions: ENTITY_PERMISSIONS,
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      clearanceLevel: u.clearanceLevel,
      name: u.name,
      badgeId: u.badgeId,
      department: u.department
    }))
  });
});

router.post("/login", (req, res) => {
  const { username, role, badgeId } = req.body;
  let user = users.find(u => u.username === username);

  if (!user && role) {
    user = users.find(u => u.role === role);
  }

  if (!user) {
    const roleLevel = ROLE_LEVELS[role] ? ROLE_LEVELS[role].level : 2;
    user = {
      id: `usr-${Date.now()}`,
      username: username || "officer_user",
      role: role || "INVESTIGATOR",
      clearanceLevel: roleLevel,
      name: username ? `Officer ${username}` : "State Cyber Officer",
      badgeId: badgeId || "POL-8842",
      department: "Cyber Investigation Cell"
    };
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      clearanceLevel: user.clearanceLevel,
      name: user.name,
      badgeId: user.badgeId
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  createAuditEntry(user.id, user.username, user.role, "USER_LOGIN", user.id, {
    ip: req.ip,
    clearanceLevel: user.clearanceLevel,
    badgeId: user.badgeId
  });

  res.json({
    status: "success",
    token,
    user,
    roleLevels: ROLE_LEVELS,
    entityPermissions: ENTITY_PERMISSIONS,
    mfaRequired: true,
    otpAuthUrl: mfaSecret.otpauth_url
  });
});

router.post("/verify-mfa", (req, res) => {
  const { token, code } = req.body;
  // Demo verification: accepts 123456 or valid speakeasy token
  const verified = code === "123456" || speakeasy.totp.verify({
    secret: mfaSecret.base32,
    encoding: "base32",
    token: code
  });

  if (!verified) {
    return res.status(400).json({ error: "Invalid TOTP verification code. Use demo code '123456'." });
  }

  createAuditEntry("usr-demo", "demo_user", "INVESTIGATOR", "MFA_VERIFIED", "session", { codeUsed: "*****" });
  res.json({ status: "success", message: "2FA TOTP Authentication Verified Successfully" });
});

module.exports = router;

