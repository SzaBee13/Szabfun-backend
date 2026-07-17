const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbsDir = path.join(__dirname, "..", "dbs");
if (!fs.existsSync(dbsDir)) {
  fs.mkdirSync(dbsDir, { recursive: true });
}

const admins = new sqlite3.Database(path.join(dbsDir, "admins.db"), (err) => {
  if (err) {
    console.error("Error opening admins database:", err.message);
  } else {
    console.log("Connected to SQLite database. (admins)");
    admins.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL
            );
        `);
    admins.run(`
            CREATE TABLE IF NOT EXISTS suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                game TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        `);
  }
});

const { users } = require("./users.js");
const { sendMail } = require("./email.js");
const { ownerId } = require("./owner.js");

const ADMIN_CACHE_TTL = 60_000;
let adminIdsCache = null;
let adminIdsCacheTime = 0;

function getAdminIds(callback) {
  const now = Date.now();
  if (adminIdsCache && now - adminIdsCacheTime < ADMIN_CACHE_TTL) {
    return callback(null, [...adminIdsCache]);
  }

  admins.all("SELECT google_id FROM admins", [], (err, rows) => {
    if (err) return callback(err, []);
    const ids = rows.map((r) => r.google_id);
    if (!ids.includes(ownerId)) ids.push(ownerId);
    adminIdsCache = ids;
    adminIdsCacheTime = now;
    callback(null, [...ids]);
  });
}

function invalidateAdminCache() {
  adminIdsCache = null;
  adminIdsCacheTime = 0;
}

function isAdmin(id, callback) {
  getAdminIds((err, ids) => {
    if (err) return callback(err, false);
    callback(null, ids.includes(id));
  });
}

const EMAIL_BATCH_SIZE = 20;

async function sendMailAdmin(id, body, callback) {
  getAdminIds(async (err, ids) => {
    if (err) return callback({ status: 500, message: "DB error" });
    if (!ids.includes(id)) {
      return callback({ status: 403, message: "Forbidden: Not admin" });
    }

    const { subject, message } = body;
    users.all("SELECT email FROM users", [], async (err, rows) => {
      if (err) {
        return callback({ status: 500, message: "Failed to fetch users" });
      }
      try {
        for (let i = 0; i < rows.length; i += EMAIL_BATCH_SIZE) {
          const batch = rows.slice(i, i + EMAIL_BATCH_SIZE);
          await Promise.allSettled(
            batch.map((user) => sendMail(user.email, subject, message, "admin")),
          );
        }
        callback(null);
      } catch (err) {
        callback({ status: 500, message: err.toString() });
      }
    });
  });
}

function getAdmins(id, callback) {
  getAdminIds((err, ids) => {
    if (err) return callback({ status: 500, message: "DB error" });
    if (!ids.includes(id)) {
      return callback({ status: 403, message: "Forbidden: Not admin" });
    }

    admins.all("SELECT google_id FROM admins", [], (err, rows) => {
      if (err) {
        return callback({ status: 500, message: "Failed to fetch admins" });
      }
      let adminIds = rows.map((r) => r.google_id);
      if (!adminIds.includes(ownerId)) adminIds.push(ownerId);

      if (adminIds.length === 0) return callback(null, []);

      users.all(
        `SELECT id, email, name FROM users WHERE id IN (${adminIds
          .map(() => "?")
          .join(",")})`,
        adminIds,
        (err, userRows) => {
          if (err) {
            return callback({
              status: 500,
              message: "Failed to fetch user info",
            });
          }
          const userMap = {};
          if (userRows) {
            for (const u of userRows) {
              userMap[u.id] = [u.email, u.name];
            }
          }
          const adminsArr = adminIds.map((id) => [
            id,
            userMap[id]?.[0] || null,
            userMap[id]?.[1] || null,
          ]);
          callback(null, adminsArr);
        }
      );
    });
  });
}

function saveSuggestion(userId, game, message, callback) {
  admins.run(
    `INSERT INTO suggestions (user_id, game, message) VALUES (?, ?, ?)`,
    [userId, game, message],
    function(err) {
      if (err) {
        return callback({ status: 500, message: "Failed to save suggestion" });
      }
      callback(null, { id: this.lastID });
    }
  );
}

function getSuggestions(userId, callback) {
  getAdminIds((err, adminIds) => {
    if (err) return callback({ status: 500, message: "DB error" });
    if (!adminIds.includes(userId)) {
      return callback({ status: 403, message: "Forbidden: Not admin" });
    }

    admins.all(
      `SELECT s.id, s.user_id, s.game, s.message, s.created_at, u.name, u.email 
       FROM suggestions s 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC`,
      [],
      (err, rows) => {
        if (err) {
          return callback({ status: 500, message: "Failed to fetch suggestions" });
        }
        callback(null, rows || []);
      }
    );
  });
}

module.exports = {
  isAdmin,
  sendMailAdmin,
  getAdmins,
  saveSuggestion,
  getSuggestions,
  admins,
  invalidateAdminCache,
};
