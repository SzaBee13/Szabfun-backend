const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = 3000;

const { saveGameData, loadGameData } = require("./game-save.js");
const { register } = require("./users.js");
const {
  isAdmin,
  sendMailAdmin,
  getAdmins,
  saveSuggestion,
  getSuggestions,
} = require("./admin.js");
const { ownerId, isOwner, addAdmin, removeAdmin } = require("./owner.js");
const {
  createCustomLink,
  createPrivateShortLink,
  getCustomLinks,
  searchLink,
} = require("./sus-link.js");
const { createBoard, isValidMove, checkWinner } = require("./tic-tac-toe.js");
const { setupChaosClicker } = require("./chaos-clicker.js");
const { setupChat } = require("./chat.js");

const allowedOrigins = [
  "https://fun.szabee.me",
  // "http://localhost:5500"
];

const saveLoadCors = (req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || allowedOrigins[0]);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    return next();
  }

  res.status(403).json({ error: "Origin not allowed" });
};

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.redirect("https://fun.szabee.me/docs");
});

app.get("/status", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Save game data endpoint
app.post("/save/:game", saveLoadCors, (req, res) => {
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
app.get("/load/:game", saveLoadCors, (req, res) => {
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
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "User already registered." });
      }
      return res.status(500).json({ error: "Failed to register user." });
    }
    res.json({ message: "Registration successful." });
  });
});

app.get("/admin/is-admin", saveLoadCors, (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  isAdmin(userId, (err, isAdminResult) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ isAdmin: isAdminResult });
  });
});

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
    res.json({ isOwner: result ? true : false });
  });
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
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const googleId = authHeader.replace("Bearer ", "");

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

// POST /suggestions/create
app.post("/suggestions/create", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const userId = authHeader.replace("Bearer ", "");
  const { game, message } = req.body;

  if (!game || !message) {
    return res.status(400).json({ error: "Game and message are required" });
  }

  saveSuggestion(userId, game, message, (err, result) => {
    if (err) {
      return res.status(err.status).json({ error: err.message });
    }
    res.json({ success: true, id: result.id });
  });
});

// GET /suggestions/get-all
app.get("/suggestions/get-all", saveLoadCors, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const userId = authHeader.replace("Bearer ", "");

  getSuggestions(userId, (err, suggestions) => {
    if (err) {
      return res.status(err.status).json({ error: err.message });
    }
    res.json({ suggestions });
  });
});

// POST /sus-link/create-custom-link
app.post("/sus-link/create-custom-link", (req, res) => {
  const { name, endpoint, author } = req.body;
  if (!name || !endpoint || !author) {
    return res
      .status(400)
      .json({ error: "Name, endpoint, and author are required." });
  }
  createCustomLink({ name, endpoint, author }, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to create custom link." });
    }
    res.json(result);
  });
});

// POST /sus-link/create-random-short
app.post("/sus-link/create-random-short", (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint is required." });
  }

  createPrivateShortLink({ endpoint }, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to create random short link." });
    }
    res.json({ randomShortVersion: result.randomShortVersion });
  });
});

// GET /sus-link/get-custom
app.get("/sus-link/get-custom", (req, res) => {
  getCustomLinks((err, links) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve custom links." });
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
  cors: { origin: allowedOrigins },
  path: "/tic-tac-toe/socket.io",
});

let waitingPlayer = null;
const boards = {};
const playAgainRequests = {};
const playerRooms = new Map();

ticTacToeIo.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  if (waitingPlayer) {
    const room = `${waitingPlayer.id}#${socket.id}`;
    socket.join(room);
    waitingPlayer.join(room);

    socket.emit("startGame", { room, symbol: "O" });
    waitingPlayer.emit("startGame", { room, symbol: "X" });

    playerRooms.set(waitingPlayer.id, room);
    playerRooms.set(socket.id, room);
    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
  }

  socket.on("joinRoom", (room) => {
    socket.join(room);
    const clients = Array.from(
      ticTacToeIo.sockets.adapter.rooms.get(room) || [],
    );
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

  socket.on("move", ({ room, board }) => {
    const lastBoard = boards[room] || Array(9).fill("");
    const index = board.findIndex((cell, i) => cell !== lastBoard[i]);
    if (index === -1) {
      return socket.emit("invalidMove", { room });
    } else if (!isValidMove(lastBoard, index, board[index])) {
      return socket.emit("invalidMove", { room });
    } else {
      boards[room] = board;
      ticTacToeIo.to(room).emit("updateBoard", { board });
      const winner = checkWinner(board);
      if (winner) {
        ticTacToeIo.to(room).emit("gameOver", { winner });
        cleanupRoom(room);
      }
    }
  });

  socket.on("playAgain", ({ room }) => {
    if (!playAgainRequests[room]) playAgainRequests[room] = new Set();
    playAgainRequests[room].add(socket.id);

    const count = playAgainRequests[room].size;
    ticTacToeIo.to(room).emit("playAgainRequested", { count });

    const clients = Array.from(
      ticTacToeIo.sockets.adapter.rooms.get(room) || [],
    );
    if (count === 2 && clients.length === 2) {
      const newBoard = createBoard();
      boards[room] = newBoard;
      ticTacToeIo.to(room).emit("playAgain");
      ticTacToeIo.to(room).emit("updateBoard", { board: newBoard });
      playAgainRequests[room] = new Set();
    }
  });

  socket.on("gameOver", ({ room, winner }) => {
    ticTacToeIo.to(room).emit("gameOver", { winner });
    cleanupRoom(room);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket) waitingPlayer = null;

    const room = playerRooms.get(socket.id);
    if (room) {
      ticTacToeIo.to(room).emit("gameOver", { winner: "disconnect" });
      cleanupRoom(room);
      playerRooms.delete(socket.id);
    }

    console.log(`Player disconnected: ${socket.id}`);
  });
});

function cleanupRoom(room) {
  delete boards[room];
  delete playAgainRequests[room];

  const clients = Array.from(
    ticTacToeIo.sockets.adapter.rooms.get(room) || [],
  );
  for (const clientId of clients) {
    playerRooms.delete(clientId);
  }
}

// Chaos Clicker
setupChaosClicker(server);

// Chat
setupChat(server);

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
