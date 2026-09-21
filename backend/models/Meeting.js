const mongoose = require('mongoose');

const ActionItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  task: { type: String, required: true },
  owner: { type: String, default: 'Investigating Officer' },
  deadline: { type: String, default: () => new Date(Date.now() + 86400000).toISOString().split('T')[0] },
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' }
}, { _id: false });

const PiiEntitySchema = new mongoose.Schema({
  entity_type: { type: String, required: true },
  value: { type: String, required: true },
  start: { type: Number },
  end: { type: Number },
  score: { type: Number, default: 1.0 }
}, { _id: false });

const AudioStorageSchema = new mongoose.Schema({
  fileName: { type: String },
  originalName: { type: String },
  storagePath: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String, default: 'audio/wav' },
  sha256Hash: { type: String }
}, { _id: false });

const MeetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  caseFir: { type: String, trim: true, index: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: {
    type: String,
    enum: ['DRAFT_PENDING_REVIEW', 'OFFICIALLY_APPROVED'],
    default: 'DRAFT_PENDING_REVIEW',
    index: true
  },
  createdBy: { type: String, required: true },
  approvedBy: { type: String, default: null },

  // Audio file reference
  audioStorage: { type: AudioStorageSchema, default: null },

  // Transcripts
  rawTranscript: { type: String, default: '' },
  redactedTranscript: { type: String, required: true },
  entitiesFound: [PiiEntitySchema],

  // Structured MoM Document
  agenda: [{ type: String }],
  decisions: [{ type: String }],
  action_items: [ActionItemSchema],

  mom: {
    title: { type: String },
    summary: { type: String },
    incident_type: { type: String },
    severity: { type: String },
    attendees: [{ type: String }],
    agenda: [{ type: String }],
    decisions: [{ type: String }],
    action_items: [ActionItemSchema]
  }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Meeting', MeetingSchema);
