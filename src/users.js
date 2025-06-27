const sqlite3 = require("sqlite3").verbose();
const dbPath = "./dbs/users.db";

const users = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening users database:", err.message);
  } else {
    console.log("Connected to SQLite database. (users)");
    users.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL
            );
        `);
  }
});

const { sendMail } = require("./email.js")

function getRegisterEmail(name) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:32px;">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px #0001;padding:32px 24px;">
        <div style="text-align:center;">
          <img src="https://szabfun.pages.dev/img/logo.png" alt="Szabfun Logo" style="width:80px;margin-bottom:16px;">
          <h1 style="color:#007BFF;margin-bottom:8px;">Welcome to Szabfun!</h1>
          <p style="font-size:1.1em;color:#333;margin-bottom:24px;">
            Hi <b>${name || "there"}</b>,<br>
            Thanks for joining <a href="https://szabfun.pages.dev" style="color:#007BFF;text-decoration:none;">Szabfun</a>!<br>
            We’re excited to have you as part of our fun community.
          </p>
          <a href="https://szabfun.pages.dev" style="display:inline-block;background:#007BFF;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;margin-bottom:24px;">Go to Homepage</a>
          <hr style="margin:32px 0;border:none;border-top:1px solid #eee;">
          <p style="color:#555;font-size:0.95em;">
            You can always check our <a href="https://szabfun.pages.dev/privacy-policy" style="color:#007BFF;">Privacy Policy</a>.<br>
            If you have questions, just reply to this email.<br>
            <br>
            Have fun!<br>
            <span style="color:#007BFF;font-weight:bold;">Szabfun Team</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function register(id, name, email, callback) {
  users.run(
    `INSERT INTO users (id, name, email) VALUES (?, ?, ?)`,
    [id, name, email],
    async (err) => {
      if (err) {
        console.error("Error registering user:", err.message);
        return callback(err);
      } else {
        const html = getRegisterEmail(name);
        try {
          await sendMail(email, "Welcome to SzabFun!", html);
          console.log(`User registered: ${name} (${email})`);
          return callback(null);
        } catch (mailErr) {
          console.error("Error sending mail:", mailErr);
          return callback(mailErr);
        }
      }
    }
  );
}

module.exports = {
  register,
  users,
};
