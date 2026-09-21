const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Target directory for local audio storage (can be configured via AUDIO_STORAGE_PATH)
const AUDIO_DIR = path.resolve(process.env.AUDIO_STORAGE_PATH || path.join(__dirname, '../../storage/audio'));

// Ensure storage directory exists
try {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Audio storage directory creation note:', e.message);
}

/**
 * Save an uploaded audio buffer to local disk storage
 * @param {Buffer} buffer - Raw audio file buffer
 * @param {string} meetingId - Meeting identification key
 * @param {string} originalName - Original uploaded filename
 * @param {string} mimeType - Audio mime type
 * @returns {Object} Metadata including storage path and SHA-256 hash
 */
function saveAudioFile(buffer, meetingId, originalName = 'audio.wav', mimeType = 'audio/wav') {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  // Ensure directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const ext = path.extname(originalName) || '.wav';
  const cleanBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${meetingId}_${Date.now()}_${cleanBase}${ext}`;
  const filePath = path.join(AUDIO_DIR, fileName);

  // Compute cryptographic SHA-256 hash for legal evidence custody
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Write file to local disk
  fs.writeFileSync(filePath, buffer);

  return {
    provider: 'LOCAL_DISK',
    fileName,
    originalName,
    storagePath: filePath,
    relativeUrl: `/api/meetings/${meetingId}/audio`,
    fileSize: buffer.length,
    mimeType,
    sha256Hash,
    savedAt: new Date().toISOString()
  };
}

/**
 * Get absolute path to stored audio file
 * @param {string} fileNameOrPath - Audio file name or path
 * @returns {string|null} Path to existing file, or null
 */
function getAudioFilePath(fileNameOrPath) {
  if (!fileNameOrPath) return null;

  // If already absolute path and exists
  if (path.isAbsolute(fileNameOrPath) && fs.existsSync(fileNameOrPath)) {
    return fileNameOrPath;
  }

  // Check in AUDIO_DIR
  const directPath = path.join(AUDIO_DIR, path.basename(fileNameOrPath));
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  return null;
}

/**
 * Delete audio file from storage
 * @param {string} fileNameOrPath
 */
function deleteAudioFile(fileNameOrPath) {
  try {
    const fullPath = getAudioFilePath(fileNameOrPath);
    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (e) {
    console.warn('Error deleting audio file:', e.message);
  }
}

module.exports = {
  AUDIO_DIR,
  saveAudioFile,
  getAudioFilePath,
  deleteAudioFile
};
