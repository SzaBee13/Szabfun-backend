const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const dbsDir = path.join(__dirname, "..", "dbs");
if (!fs.existsSync(dbsDir)) {
  fs.mkdirSync(dbsDir, { recursive: true });
}

const PRIVATE_GENERATED_AUTHOR = "__private_generated__";

const susLinkDb = new sqlite3.Database(path.join(dbsDir, "sus-link.db"), (err) => {
  if (err) {
    console.error("Error opening sus-link database:", err.message);
  } else {
    console.log("Connected to SQLite database. (sus-link)");
    susLinkDb.run(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        randomName TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        author TEXT NOT NULL
      )
    `);
  }
});

function insertLinkWithRetry({ name, endpoint, author }, callback, attemptsLeft = 5) {
  const randomName = crypto.randomBytes(4).toString("hex");

  susLinkDb.run(
    "INSERT INTO links (randomName, url, name, author) VALUES (?, ?, ?, ?)",
    [randomName, endpoint, name, author],
    function (err) {
      if (err) {
        // Retry on random short-code collision.
        if (err.message && err.message.includes("UNIQUE constraint failed") && attemptsLeft > 1) {
          return insertLinkWithRetry({ name, endpoint, author }, callback, attemptsLeft - 1);
        }
        return callback(err);
      }

      callback(null, {
        name,
        endpoint,
        author,
        randomShortVersion: randomName,
      });
    }
  );
}

function createCustomLink({ name, endpoint, author }, callback) {
  insertLinkWithRetry({ name, endpoint, author }, callback);
}

function createPrivateShortLink({ endpoint }, callback) {
  insertLinkWithRetry(
    {
      name: "Generated private short link",
      endpoint,
      author: PRIVATE_GENERATED_AUTHOR,
    },
    callback
  );
}

function getCustomLinks(callback) {
  susLinkDb.all(
    "SELECT randomName, url, name, author FROM links WHERE author != ?",
    [PRIVATE_GENERATED_AUTHOR],
    (err, rows) => {
      if (err) return callback(err);
      const customLinks = rows.map((row) => ({
        randomShortVersion: row.randomName,
        endpoint: row.url,
        name: row.name,
        author: row.author,
      }));
      callback(null, customLinks);
    }
  );
}

function searchLink(randomName, callback) {
  susLinkDb.get(
    "SELECT url FROM links WHERE randomName = ?",
    [randomName],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row ? row.url : null);
    }
  );
}

module.exports = {
  susLinkDb,
  createCustomLink,
  createPrivateShortLink,
  getCustomLinks,
  searchLink,
};