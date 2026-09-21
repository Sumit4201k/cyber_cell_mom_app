const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  prevHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
