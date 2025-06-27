const sqlite3 = require("sqlite3").verbose();
const dbPath = "./dbs/sus-link.db";

const susLinkDb = new sqlite3.Database(dbPath, (err) => {
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

function createCustomLink({ name, endpoint, author }, callback) {
  const crypto = require("crypto");
  const randomName = crypto.randomBytes(4).toString("hex");
  const url = endpoint;

  susLinkDb.run(
    "INSERT INTO links (randomName, url, name, author) VALUES (?, ?, ?, ?)",
    [randomName, url, name, author],
    function (err) {
      if (err) return callback(err);
      callback(null, {
        name,
        endpoint: url,
        author,
        randomShortVersion: randomName,
      });
    }
  );
}

function getCustomLinks(callback) {
  susLinkDb.all(
    "SELECT randomName, url, name, author FROM links",
    [],
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
  getCustomLinks,
  searchLink,
};