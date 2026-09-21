const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['ADMIN', 'INVESTIGATOR', 'ANALYST', 'FIELD_OFFICER', 'TRAINEE', 'AUDITOR'],
    default: 'INVESTIGATOR',
    index: true
  },
  clearanceLevel: { type: Number, required: true, min: 0, max: 5, default: 2 },
  badgeId: { type: String, required: true, index: true },
  department: { type: String, default: 'Cyber Investigation Cell' },
  passwordHash: { type: String },
  mfaSecret: { type: String },
  otpAuthUrl: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
