const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors"); // Import the cors package
const path = require("path");

const app = express();
const port = 3000;

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
                lastSaved INTEGER,
                PRIMARY KEY (google_id, game)
            );
        `);
    }
});

// Save game data
app.post("/save/:game", (req, res) => {
    const game = req.params.game;
    const google_id = req.body.google_id;
    const saveData = JSON.stringify(req.body.data); // use a different variable name!!

    data.run(
        `INSERT OR REPLACE INTO game_saves (google_id, game, data) VALUES (?, ?, ?)`,
        [google_id, game, saveData],
        (err) => {
            if (err) {
                console.error("DB save error:", err.message);
                res.status(500).send("Failed to save data");
            } else {
                res.send("Game data saved!");
            }
        }
    );
});

// Load game data
app.get("/load/:game", (req, res) => {
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
        return res
            .status(400)
            .json({ error: "Query parameter 'l' is required." });
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
            ticTacToeIo
                .to(secondId)
                .emit("startGame", {
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
        description:
            "Clicks are reversed and time cookies stop for 30 seconds!",
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
