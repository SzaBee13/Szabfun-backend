const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const dotenv = require("dotenv");
const { google } = require("googleapis");
dotenv.config();

const app = express();
const port = 3000;

const allowedOrigins = [
  "https://szabfun.pages.dev",
  // "http://localhost:5500"
];

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Admins
const ownerId = "116064392884345426976";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail(to, subject, message) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const email = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    message,
  ].join("\n");

  const encodedMessage = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
}

sendMail("miabajodlol@gmail.com", "Test Email", "<h1>Hello from Szabfun!</h1>");

const saveLoadCors = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
});

// Enable CORS for all origins
app.use(cors());

// Middleware
app.use(bodyParser.json());

// Predefined normal links
const linkList = {
  "send-to-friend": {
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    randomName: "4QpRNYUH",
  },
  impastor: {
    url: "https://www.google.com/search?q=download+among+us",
    randomName: "p4CmUyJ5",
  },
  iknow: { url: "https://whatismyipaddress.com", randomName: "g6fKDcVt" },
  "you-spelled-it-wrong": {
    url: "https://guthib.com",
    randomName: "NJHibeNK",
  },
  nerd: { url: "https://hackertyper.net", randomName: "M5VuMzDm" },
  infinity: {
    url: "https://neal.fun/infinite-craft/",
    randomName: "mH7t5570",
  },
  alma: { url: "https://almalang.pages.dev", randomName: "4vW5Wtre" },
  valkon: { url: "https://valkonclient.pages.dev", randomName: "YGCXPMAX" },
  sus: {
    url: "https://www.youtube.com/shorts/vdu8Jeu2IS0",
    randomName: "AChUi5ut",
  },
  "english-or-spanish": {
    url: "https://www.youtube.com/watch?v=gQk8SrLjqvg",
    randomName: "7fCNGW6U",
  },
  learn: { url: "https://www.duolingo.com/learn", randomName: "qkJ9LwGd" },
  corn: { url: "https://cornhub.website", randomName: "0DjDqKRg" },
  x: { url: "https://x.com", randomName: "MSC3ktz8" },
  technoblade: {
    url: "https://www.youtube.com/watch?v=R_fZjGm2OrM",
    randomName: "yN4BgDaG",
  },
  "i-am-not-a-robot": {
    url: "https://www.youtube.com/watch?v=j8BjGMt2IgQ",
    randomName: "gMCSaeYk",
  },
  search: { url: "https://www.google.com", randomName: "20zjkeSQ" },
};

// Database setup
const susLinkDb = new sqlite3.Database("./sus-link.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
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

const data = new sqlite3.Database("./data.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database. (saved data)");
    data.run(`
            CREATE TABLE IF NOT EXISTS game_saves (
                google_id TEXT,
                game TEXT,
                data TEXT,
                PRIMARY KEY (google_id, game)
            );
        `);
  }
});

const users = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
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

// --- Add after ownerId definition ---
const adminsDb = new sqlite3.Database("./admins.db", (err) => {
  if (err) {
    console.error("Error opening admins.db:", err.message);
  } else {
    adminsDb.run(`
      CREATE TABLE IF NOT EXISTS admins (
        google_id TEXT PRIMARY KEY
      );
    `);
  }
});

function getAdminIds(callback) {
  adminsDb.all("SELECT google_id FROM admins", [], (err, rows) => {
    if (err) return callback(err, []);
    const ids = rows.map((r) => r.google_id);
    // Always include ownerId as admin
    if (!ids.includes(ownerId)) ids.push(ownerId);
    callback(null, ids);
  });
}

// Redirect "/" to szabfun.pages.dev/docs
app.get("/", (req, res) => {
  res.redirect("https://szabfun.pages.dev/docs");
});

// Return status for "/status"
app.get("/status", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Save game data
app.post("/save/:game", saveLoadCors, (req, res) => {
  const game = req.params.game;
  const google_id = req.body.google_id;
  const savePayload = JSON.stringify(req.body.data); // ✨ renamed from 'saveData'

  data.run(
    `INSERT OR REPLACE INTO game_saves (google_id, game, data) VALUES (?, ?, ?)`,
    [google_id, game, savePayload],
    (err) => {
      if (err) {
        console.error("DB save error:", err.message);
        res.status(500).send("Failed to save data");
      } else {
        res.send("Response saved successfully");
      }
    }
  );
});

// Load game data
app.get("/load/:game", saveLoadCors, (req, res) => {
  const game = req.params.game;
  const google_id = req.query.google_id;

  if (!google_id) {
    return res.status(400).json({ error: "Missing google_id" });
  }

  data.get(
    `
        SELECT data FROM game_saves
        WHERE google_id = ? AND game = ?
    `,
    [google_id, game],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB error" });
      }

      if (row) {
        res.json({
          data: JSON.parse(row.data),
        });
      } else {
        res.json({ data: null });
      }
    }
  );
});

// Register user
app.post("/register", saveLoadCors, (req, res) => {
  const { id, name, email } = req.body;
  //     if (!id || !name || !email) {
  //         return res.status(400).json({ error: "ID, name, and email are required." });
  //     }

  users.run(
    `INSERT INTO users (id, name, email) VALUES (?, ?, ?)`,
    [id, name, email],
    (err) => {
      if (err) {
        console.error("Error registering user:", err.message);
        res.status(500).json({ error: "Failed to register user." });
      } else {
        const html = `
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

        sendMail(email, "Welcome to SzabFun!", html);
        console.log(`User registered: ${name} (${email})`);
        res.sendStatus(200);
      }
    }
  );
});

// --- Update admin check to use DB ---
app.get("/admin/is-admin", saveLoadCors, (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  getAdminIds((err, ids) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ isAdmin: ids.includes(userId) });
  });
});

// --- Update /admin/send-email to use DB ---
app.post("/admin/send-email", saveLoadCors, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");
  getAdminIds(async (err, ids) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!ids.includes(googleId)) {
      return res.status(403).json({ error: "Forbidden: Not admin" });
    }

    const { subject, message } = req.body;
    users.all("SELECT email FROM users", [], async (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch users" });
      }
      try {
        for (const user of rows) {
          await sendMail(user.email, subject, message);
        }
        res.sendStatus(200);
      } catch (err) {
        res.status(500).send(err.toString());
      }
    });
  });
});

app.get("/owner/is-owner", saveLoadCors, (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  if (userId === ownerId) {
    return res.json({ isOwner: true });
  }
  res.json({ isOwner: false });
});

app.post("/owner/add-admin", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");
  if (googleId !== ownerId) {
    return res.status(403).json({ error: "Forbidden: Not owner" });
  }

  const { adminGoogleId } = req.body;
  if (!adminGoogleId) {
    return res.status(400).json({ error: "Missing adminGoogleId" });
  }

  adminsDb.run(
    "INSERT OR IGNORE INTO admins (google_id) VALUES (?)",
    [adminGoogleId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to add admin" });
      }
      res.json({ success: true, adminGoogleId });
    }
  );
});

app.post("/owner/remove-admin", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");

  // Check if the user is the owner
  if (googleId !== ownerId) {
    return res.status(403).json({ error: "Forbidden: Not owner" });
  }

  const { adminGoogleId } = req.body;
  if (!adminGoogleId) {
    return res.status(400).json({ error: "Missing adminGoogleId" });
  }

  adminsDb.run(
    "DELETE FROM admins WHERE google_id = ?",
    [adminGoogleId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to remove admin" });
      }
      res.json({ success: true, adminGoogleId });
    }
  );
});

// POST /sus-link/create-custom-link - Create a custom link with additional fields
app.post("/sus-link/create-custom-link", (req, res) => {
  const { name, endpoint, author } = req.body;

  if (!name || !endpoint || !author) {
    return res
      .status(400)
      .json({ error: "Name, endpoint, and author are required." });
  }

  const randomName = crypto.randomBytes(4).toString("hex");
  const url = endpoint;

  susLinkDb.run(
    "INSERT INTO links (randomName, url, name, author) VALUES (?, ?, ?, ?)",
    [randomName, url, name, author],
    function (err) {
      if (err) {
        console.error("Error creating custom link:", err.message);
        res.status(500).json({
          error: "Failed to create custom link.",
        });
      } else {
        res.json({
          name,
          endpoint: url,
          author,
          randomShortVersion: randomName,
        });
      }
    }
  );
});

// GET /sus-link/get-custom - Retrieve all custom links with additional fields
app.get("/sus-link/get-custom", (req, res) => {
  susLinkDb.all(
    "SELECT randomName, url, name, author FROM links",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error retrieving custom links:", err.message);
        res.status(500).json({
          error: "Failed to retrieve custom links.",
        });
      } else {
        const customLinks = rows.map((row) => ({
          randomShortVersion: row.randomName,
          endpoint: row.url,
          name: row.name,
          author: row.author,
        }));
        res.json(customLinks);
      }
    }
  );
});

// GET /sus-link/search - Search for a link by randomName
app.get("/sus-link/search", (req, res) => {
  const { l } = req.query;

  if (!l) {
    return res.status(400).json({ error: "Query parameter 'l' is required." });
  }

  // Check predefined links first
  const predefinedLink = Object.values(linkList).find(
    (link) => link.randomName === l
  );
  if (predefinedLink) {
    return res.json({ url: predefinedLink.url });
  }

  // Check custom links in the database
  susLinkDb.get(
    "SELECT url FROM links WHERE randomName = ?",
    [l],
    (err, row) => {
      if (err) {
        console.error("Error searching for link:", err.message);
        res.status(500).json({ error: "Failed to search for link." });
      } else if (row) {
        res.json({ url: row.url });
      } else {
        res.status(404).json({ error: "Link not found." });
      }
    }
  );
});

const http = require("http");
const { Server } = require("socket.io");
const { send } = require("process");

const server = http.createServer(app);
const ticTacToeIo = new Server(server, {
  cors: { origin: "*" },
  path: "/tic-tac-toe/socket.io", // 👈 custom path here
});

// Multiplayer Tic-Tac-Toe logic
let waitingPlayer = null;

ticTacToeIo.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  if (waitingPlayer) {
    const room = `${waitingPlayer.id}#${socket.id}`;
    socket.join(room);
    waitingPlayer.join(room);

    // Assign symbols
    socket.emit("startGame", { room, symbol: "O" });
    waitingPlayer.emit("startGame", { room, symbol: "X" });

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
  }

  socket.on("joinRoom", (room) => {
    socket.join(room);
    const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
    if (clients.length === 1) {
      // First player waits for opponent, no symbol assigned yet
      socket.emit("waitingForOpponent", { room });
    } else if (clients.length === 2) {
      // Second player joins, assign symbols randomly
      const symbol = Math.random() < 0.5 ? "X" : "O";
      const [firstId, secondId] = clients;
      // Assign symbols
      ticTacToeIo.to(firstId).emit("startGame", { room, symbol });
      ticTacToeIo.to(secondId).emit("startGame", {
        room,
        symbol: symbol === "X" ? "O" : "X",
      });
    } else {
      // Room full or error
      socket.emit("roomFull", { room });
    }
  });

  socket.on("move", ({ room, board }) => {
    socket.to(room).emit("updateBoard", board);
  });

  socket.on("gameOver", ({ room, winner }) => {
    // Broadcast to both players in the room
    ticTacToeIo.to(room).emit("gameOver", { winner });
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket) waitingPlayer = null;
    console.log(`Player disconnected: ${socket.id}`);
  });
});

const chaosClickerIo = new Server(server, {
  cors: { origin: "*" },
  path: "/chaos-clicker/socket.io",
});

// Track currently active events
const activeChaosEvents = new Set();
// Event types
const CHAOS_EVENTS = [
  {
    name: "Server Lag",
    description: "Clicks are reversed and time cookies stop for 30 seconds!",
    type: "lag",
    duration: 30,
  },
  {
    name: "Great-Grandma",
    description: "2x time multiplier for 60 seconds!",
    type: "great-grandma",
    duration: 60,
  },
  {
    name: "Shaking Hands",
    description: "0.5 click multiplier for 60 seconds!",
    type: "shaking-hands",
    duration: 60,
  },
];

function testEvent() {
  const event = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
  chaosClickerIo.emit("chaos-event", event);
  console.log(`[TEST] Emitted event: ${event.name}`);
}

let isEvent = false;

setInterval(() => {
  for (const event of CHAOS_EVENTS) {
    if (!activeChaosEvents.has(event.type) && Math.random() < 0.25) {
      chaosClickerIo.emit("chaos-event", event);
      console.log(`Emitted event: ${event.name}`);
      activeChaosEvents.add(event.type);

      // Remove from active after duration
      setTimeout(() => {
        activeChaosEvents.delete(event.type);
      }, event.duration * 1000);

      break; // Only one event per interval
    }
  }
}, 5 * 60 * 1000); // 5 minutes

server.listen(port, () => {
  console.log(`Server with Socket.IO running at http://localhost:${port}`);

  setTimeout(testEvent, 5000);
});
