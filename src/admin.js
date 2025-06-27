const sqlite3 = require("sqlite3").verbose();
const dbPath = "./dbs/admins.db";

const admins = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening admins database:", err.message);
  } else {
    console.log("Connected to SQLite database. (users)");
    admins.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL
            );
        `);
  }
});

const { users } = require("./users.js");
const { sendMail } = require("./email.js");
const { ownerId } = require("./owner.js");

function getAdminIds(callback) {
  admins.all("SELECT google_id FROM admins", [], (err, rows) => {
    if (err) return callback(err, []);
    const ids = rows.map((r) => r.google_id);
    // Always include ownerId as admin
    if (!ids.includes(ownerId)) ids.push(ownerId);
    callback(null, ids);
  });
}

function isAdmin(id, callback) {
  getAdminIds((err, ids) => {
    if (err) return callback(err, false);
    callback(null, ids.includes(id));
  });
}

function sendMailAdmin(id, body, callback) {
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
        for (const user of rows) {
          await sendMail(user.email, subject, message);
        }
        callback(null); // Success
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

module.exports = {
  isAdmin,
  sendMailAdmin,
  getAdmins,
  admins,
};
