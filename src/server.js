const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = 3000;

const { saveGameData, loadGameData } = require("./game-save.js");
const { register } = require("./users.js");
const { isAdmin, sendMailAdmin, getAdmins } = require("./admin.js");
const { ownerId, isOwner, addAdmin, removeAdmin } = require("./owner.js")
const { createCustomLink, getCustomLinks, searchLink } = require("./sus-link.js");
const { createBoard, isValidMove, checkWinner } = require("./tic-tac-toe.js");
const { setupChaosClicker } = require("./chaos-clicker.js");

const allowedOrigins = [
  "https://szabfun.pages.dev",
  // "http://localhost:5500"
];

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

// Redirect "/" to szabfun.pages.dev/docs
app.get("/", (req, res) => {
  res.redirect("https://szabfun.pages.dev/docs");
});

// Return status for "/status"
app.get("/status", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Save game data endpoint
app.post("/save/:game", (req, res) => {
  const game = req.params.game;
  const google_id = req.body.google_id;
  const savePayload = JSON.stringify(req.body.data);

  saveGameData(google_id, game, savePayload, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to save data" });
    }
    res.json({ message: "Game data saved successfully" });
  });
});

// Load game data endpoint
app.get("/load/:game", (req, res) => {
  const game = req.params.game;
  const google_id = req.query.google_id;

  loadGameData(google_id, game, (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to load data" });
    }
    res.json({ data: row ? JSON.parse(row.data) : null });
  });
});

// Register user
app.post("/register", saveLoadCors, (req, res) => {
  const { id, name, email } = req.body;
  if (!id || !name || !email) {
    return res.status(400).json({ error: "ID, name, and email are required." });
  }

  register(id, name, email, (err) => {
    if (err) {
      // Handle duplicate user error (constraint violation)
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "User already registered." });
      }
      // Handle email sending error or other errors
      return res.status(500).json({ error: "Failed to register user." });
    }
    res.json({ message: "Registration successful." });
  });
});

// --- Update admin check to use DB ---
app.get("/admin/is-admin", saveLoadCors, (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  isAdmin(userId, (err, isAdminResult) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ isAdmin: isAdminResult });
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
  sendMailAdmin(googleId, req.body, (err) => {
    if (err) {
      return res.status(err.status).json({ error: err.message });
    }
    res.sendStatus(200);
  });
});

app.get("/admin/get-admins", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");
  getAdmins(googleId, (err, adminsArr) => {
    if (err) {
      return res.status(err.status).json({ error: err.message });
    }
    res.json({ admins: adminsArr });
  });
});

app.get("/owner/is-owner", saveLoadCors, (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  isOwner(userId, (err, result) => {
    res.json({ isOwner: result ? true : false })
  });
});

app.post("/owner/add-admin", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  // Add the user by id
  const googleId = authHeader.replace("Bearer ", "");
  if (googleId !== ownerId) {
    return res.status(403).json({ error: "Forbidden: Not owner" });
  }

  const type = req.query.type || "id";
  addAdmin(type, req.body, (err, result) => {
    if (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    res.json(result);
  });
});

app.post("/owner/remove-admin", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");

  // Check if the user is the owner
  if (googleId !== ownerId) {
    return res.status(403).json({ error: "Forbidden: Not owner" });
  }

  const { adminGoogleId } = req.body;
  removeAdmin(adminGoogleId, (err, result) => {
    if (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    res.json(result);
  });
});

// POST /sus-link/create-custom-link
app.post("/sus-link/create-custom-link", (req, res) => {
  const { name, endpoint, author } = req.body;
  if (!name || !endpoint || !author) {
    return res.status(400).json({ error: "Name, endpoint, and author are required." });
  }
  createCustomLink({ name, endpoint, author }, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to create custom link." });
    }
    res.json(result);
  });
});

// GET /sus-link/get-custom
app.get("/sus-link/get-custom", (req, res) => {
  getCustomLinks((err, links) => {
    if (err) {
      return res.status(500).json({ error: "Failed to retrieve custom links." });
    }
    res.json(links);
  });
});

// GET /sus-link/search
app.get("/sus-link/search", (req, res) => {
  const { l } = req.query;
  if (!l) {
    return res.status(400).json({ error: "Query parameter 'l' is required." });
  }
  searchLink(l, (err, url) => {
    if (err) {
      return res.status(500).json({ error: "Failed to search for link." });
    }
    if (url) {
      res.json({ url });
    } else {
      res.status(404).json({ error: "Link not found." });
    }
  });
});

// Tic Tac Toe
const server = http.createServer(app);
const ticTacToeIo = new Server(server, {
  cors: { origin: "*" },
  path: "/tic-tac-toe/socket.io",
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
    const clients = Array.from(ticTacToeIo.sockets.adapter.rooms.get(room) || []);
    if (clients.length === 1) {
      socket.emit("waitingForOpponent", { room });
    } else if (clients.length === 2) {
      const symbol = Math.random() < 0.5 ? "X" : "O";
      const [firstId, secondId] = clients;
      ticTacToeIo.to(firstId).emit("startGame", { room, symbol });
      ticTacToeIo.to(secondId).emit("startGame", {
        room,
        symbol: symbol === "X" ? "O" : "X",
      });
    } else {
      socket.emit("roomFull", { room });
    }
  });

  socket.on("move", ({ room, row, col, symbol }) => {
    if (!boards[room]) boards[room] = createBoard();
    if (isValidMove(boards[room], row, col)) {
      boards[room][row][col] = symbol;
      const winner = checkWinner(boards[room]);
      ticTacToeIo.to(room).emit("updateBoard", boards[room]);
      if (winner) {
        ticTacToeIo.to(room).emit("gameOver", { winner });
        delete boards[room];
      }
    } else {
      socket.emit("invalidMove");
    }
  });

  socket.on("gameOver", ({ room, winner }) => {
    ticTacToeIo.to(room).emit("gameOver", { winner });
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket) waitingPlayer = null;
    console.log(`Player disconnected: ${socket.id}`);
  });
});

// Chaos Clicker
setupChaosClicker(server);

server.listen(port, () => {
  console.log(`Server with Socket.IO running at http://localhost:${port}`);
});
