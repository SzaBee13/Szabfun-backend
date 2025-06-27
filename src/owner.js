const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
dotenv.config();

const ownerId = process.env.OWNER;

const { admins } = require("./admin.js")

function isOwner(id, callback) {
  callback(null, id === ownerId);
}

function addAdmin(type, body, callback) {
  if (type === "id") {
    const { adminGoogleId } = body;
    if (!adminGoogleId) {
      return callback({ status: 400, message: "Missing adminGoogleId" });
    }
    admins.run(
      "INSERT OR IGNORE INTO admins (google_id) VALUES (?)",
      [adminGoogleId],
      function (err) {
        if (err) {
          return callback({ status: 500, message: "Failed to add admin" });
        }
        callback(null, { success: true, adminGoogleId });
      }
    );
  } else if (type === "email") {
    const { adminEmail } = body;
    if (!adminEmail) {
      return callback({ status: 400, message: "Missing adminEmail" });
    }
    // Find user by email
    users.get(
      "SELECT id FROM users WHERE email = ?",
      [adminEmail],
      (err, row) => {
        if (err) {
          return callback({ status: 500, message: "Failed to fetch user" });
        }
        if (!row) {
          return callback({ status: 404, message: "User not found" });
        }
        const adminGoogleId = row.id;
        admins.run(
          "INSERT OR IGNORE INTO admins (google_id) VALUES (?)",
          [adminGoogleId],
          function (err) {
            if (err) {
              return callback({ status: 500, message: "Failed to add admin" });
            }
            callback(null, { success: true, adminGoogleId });
          }
        );
      }
    );
  } else {
    return callback({ status: 400, message: "Invalid type" });
  }
}

function removeAdmin(adminGoogleId, callback) {
  if (!adminGoogleId) {
    return callback({ status: 400, message: "Missing adminGoogleId" });
  }
  admins.run(
    "DELETE FROM admins WHERE google_id = ?",
    [adminGoogleId],
    function (err) {
      if (err) {
        return callback({ status: 500, message: "Failed to remove admin" });
      }
      callback(null, { success: true, adminGoogleId });
    }
  );
}

module.exports = {
  ownerId,
  isOwner,
  addAdmin,
  removeAdmin,
}