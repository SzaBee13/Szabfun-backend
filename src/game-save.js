const sqlite3 = require("sqlite3").verbose();
const dbPath = "./dbs/data.db";

const data = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening game data database:", err.message);
  } else {
    console.log("Connected to SQLite database. (users)");
  }
});

/**
 * Save game data for a user and game.
 * @param {string} google_id - The user's Google ID.
 * @param {string} game - The game identifier.
 * @param {string} savePayload - The data to save (should be stringified JSON).
 * @param {function} callback - Callback function(err).
 */
function saveGameData(google_id, game, savePayload, callback) {
  data.run(
    `INSERT OR REPLACE INTO game_saves (google_id, game, data) VALUES (?, ?, ?)`,
    [google_id, game, savePayload],
    callback
  );
}

/**
 * Load game data for a user and game.
 * @param {string} google_id - The user's Google ID.
 * @param {string} game - The game identifier.
 * @param {function} callback - Callback function(err, row).
 */
function loadGameData(google_id, game, callback) {
  data.get(
    `SELECT data FROM game_saves WHERE google_id = ? AND game = ?`,
    [google_id, game],
    callback
  );
}

module.exports = {
  saveGameData,
  loadGameData,
};