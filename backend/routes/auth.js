const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const { users, createAuditEntry } = require("../db/store");

const JWT_SECRET = process.env.JWT_SECRET || "cyber_cell_secret_jwt_key_2026_police";

// Generate MFA TOTP secret for demo user
const mfaSecret = speakeasy.generateSecret({ name: "State Cyber Cell" });

router.post("/login", (req, res) => {
  const { username, role } = req.body;
  const user = users.find(u => u.username === username) || {
    id: `usr-${Date.now()}`,
    username: username || "investigator_shinde",
    role: role || "INVESTIGATOR",
    name: "Demo Officer"
  };

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  createAuditEntry(user.id, user.username, user.role, "USER_LOGIN", user.id, { ip: req.ip });

  res.json({
    status: "success",
    token,
    user,
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
