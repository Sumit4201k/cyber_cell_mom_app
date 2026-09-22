const mongoose = require('mongoose');

let isConnected = false;

async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('ℹ️ MONGODB_URI not provided in .env — using local JSON persistence store.');
    isConnected = false;
    return false;
  }

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`🟢 Connected to MongoDB Database successfully (${mongoose.connection.name})`);

    const User = require('../models/User');
    const Meeting = require('../models/Meeting');
    const AuditLog = require('../models/AuditLog');
    const { meetings, auditLogs, users: defaultUsers, saveMeetingsToFile, saveAuditLogsToFile, saveUsersToFile } = require('./store');

    // 1. Sync & Seed Users Collection
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0 && defaultUsers.length > 0) {
        console.log('Seeding initial police officer directory into MongoDB...');
        for (const u of defaultUsers) {
          await syncUserToMongo(u);
        }
        console.log(`Seeded ${defaultUsers.length} official police profiles to MongoDB.`);
      } else {
        // Ensure master admin is updated in MongoDB
        for (const u of defaultUsers) {
          await syncUserToMongo(u);
        }
        const dbUsers = await User.find({}).lean();
        const { users } = require('./store');
        users.length = 0;
        dbUsers.forEach(u => users.push(u));
        saveUsersToFile();
        console.log(`Synced ${dbUsers.length} officer profiles from MongoDB.`);
      }
    } catch (seedErr) {
      console.warn('Note on user sync:', seedErr.message);
    }

    // 2. Sync Meetings Collection directly with MongoDB
    try {
      const meetingCount = await Meeting.countDocuments();
      if (meetingCount === 0 && meetings.length > 0) {
        console.log(`Uploading ${meetings.length} local meeting records to MongoDB...`);
        for (const m of meetings) {
          await syncMeetingToMongo(m);
        }
        console.log(`Uploaded ${meetings.length} meeting records to MongoDB.`);
      } else if (meetingCount > 0) {
        const dbMeetings = await Meeting.find({}).sort({ createdAt: -1 }).lean();
        meetings.length = 0;
        dbMeetings.forEach(m => meetings.push(m));
        saveMeetingsToFile();
        console.log(`Synced ${dbMeetings.length} meeting records from MongoDB.`);
      }
    } catch (meetingSyncErr) {
      console.warn('Note on meeting sync:', meetingSyncErr.message);
    }

    // 3. Sync Audit Logs Collection
    try {
      const logCount = await AuditLog.countDocuments();
      if (logCount === 0 && auditLogs.length > 0) {
        console.log('Migrating local cryptographic audit ledger into MongoDB...');
        await AuditLog.insertMany(auditLogs);
        console.log(`Uploaded ${auditLogs.length} audit logs to MongoDB.`);
      } else if (logCount > 0) {
        const dbLogs = await AuditLog.find({}).sort({ timestamp: 1 }).lean();
        auditLogs.length = 0;
        dbLogs.forEach(l => {
          auditLogs.push({
            id: l.id,
            timestamp: l.timestamp,
            userId: l.userId,
            username: l.username,
            role: l.role,
            action: l.action,
            resourceId: l.resourceId,
            details: l.details || {},
            prevHash: l.prevHash,
            hash: l.hash
          });
        });
        saveAuditLogsToFile();
        console.log(`Synced ${dbLogs.length} audit entries from MongoDB.`);
      }
    } catch (logSyncErr) {
      console.warn('Note on audit log sync:', logSyncErr.message);
    }

    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MongoDB connection error: ${err.message}`);
    console.log('➡️ Falling back to local persistent JSON store (data/meetings.json). Application is 100% operational.');
    return false;
  }
}

function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

// Persist / Update a single meeting document in MongoDB
async function syncMeetingToMongo(meeting) {
  if (!isMongoConnected() || !meeting || !meeting.id) return;
  try {
    const Meeting = require('../models/Meeting');
    await Meeting.findOneAndUpdate(
      { id: meeting.id },
      { $set: meeting },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    console.log(`[MONGODB] Meeting ${meeting.id} synchronized to MongoDB.`);
  } catch (err) {
    console.warn('MongoDB meeting sync error:', err.message);
  }
}

// Persist a cryptographic audit ledger entry in MongoDB
async function syncAuditLogToMongo(logEntry) {
  if (!isMongoConnected() || !logEntry || !logEntry.id) return;
  try {
    const AuditLog = require('../models/AuditLog');
    await AuditLog.findOneAndUpdate(
      { id: logEntry.id },
      { $set: logEntry },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    console.log(`[MONGODB] Audit log ${logEntry.id} synchronized to MongoDB.`);
  } catch (err) {
    console.warn('MongoDB audit log sync error:', err.message);
  }
}

// Persist a user profile document in MongoDB
async function syncUserToMongo(user) {
  if (!isMongoConnected() || !user || !user.id) return;
  try {
    const User = require('../models/User');
    await User.findOneAndUpdate(
      { id: user.id },
      { $set: user },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    console.log(`[MONGODB] User ${user.username} (${user.role}) synchronized to MongoDB.`);
  } catch (err) {
    console.warn('MongoDB user sync error:', err.message);
  }
}

// Delete a meeting document in MongoDB
async function deleteMeetingFromMongo(meetingId) {
  if (!isMongoConnected() || !meetingId) return;
  try {
    const Meeting = require('../models/Meeting');
    await Meeting.deleteOne({ id: meetingId });
  } catch (err) {
    console.warn('MongoDB meeting delete error:', err.message);
  }
}

module.exports = {
  connectMongoDB,
  isMongoConnected,
  syncMeetingToMongo,
  syncAuditLogToMongo,
  syncUserToMongo,
  deleteMeetingFromMongo,
  mongoose
};
