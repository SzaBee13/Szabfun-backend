const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors"); // Import the cors package

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
    "impastor": {
        url: "https://www.google.com/search?q=download+among+us",
        randomName: "p4CmUyJ5",
    },
    "iknow": { url: "https://whatismyipaddress.com", randomName: "g6fKDcVt" },
    "you-spelled-it-wrong": {
        url: "https://guthib.com",
        randomName: "NJHibeNK",
    },
    "nerd": { url: "https://hackertyper.net", randomName: "M5VuMzDm" },
    "infinity": {
        url: "https://neal.fun/infinite-craft/",
        randomName: "mH7t5570",
    },
    "alma": { url: "https://almalang.pages.dev", randomName: "4vW5Wtre" },
    "valkon": { url: "https://valkonclient.pages.dev", randomName: "YGCXPMAX" },
    "sus": {
        url: "https://www.youtube.com/shorts/vdu8Jeu2IS0",
        randomName: "AChUi5ut",
    },
    "english-or-spanish": {
        "url": "https://www.youtube.com/watch?v=gQk8SrLjqvg",
        "randomName": "7fCNGW6U",
    },
    "learn": { url: "https://www.duolingo.com/learn", randomName: "qkJ9LwGd" },
    "corn": { url: "https://cornhub.website", randomName: "0DjDqKRg" },
    "x": { url: "https://x.com", randomName: "MSC3ktz8" },
    "technoblade": {
        url: "https://www.youtube.com/watch?v=R_fZjGm2OrM",
        randomName: "yN4BgDaG",
    },
    "i-am-not-a-robot": {
        url: "https://www.youtube.com/watch?v=j8BjGMt2IgQ",
        randomName: "gMCSaeYk",
    },
    "search": { url: "https://www.google.com", randomName: "20zjkeSQ" },
};

// Middleware
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database("./sus-link.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
        db.run(`
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


// POST /sus-link/create-custom-link - Create a custom link with additional fields
app.post("/sus-link/create-custom-link", (req, res) => {
    const { name, endpoint, author } = req.body;

    if (!name || !endpoint || !author) {
        return res.status(400).json({ error: "Name, endpoint, and author are required." });
    }

    const randomName = crypto.randomBytes(4).toString("hex");
    const url = endpoint;

    db.run(
        "INSERT INTO links (randomName, url, name, author) VALUES (?, ?, ?, ?)",
        [randomName, url, name, author],
        function (err) {
            if (err) {
                console.error("Error creating custom link:", err.message);
                res.status(500).json({ error: "Failed to create custom link." });
            } else {
                res.json({ name, endpoint: url, author, randomShortVersion: randomName });
            }
        }
    );
});

// GET /sus-link/get-custom - Retrieve all custom links with additional fields
app.get("/sus-link/get-custom", (req, res) => {
    db.all("SELECT randomName, url, name, author FROM links", [], (err, rows) => {
        if (err) {
            console.error("Error retrieving custom links:", err.message);
            res.status(500).json({ error: "Failed to retrieve custom links." });
        } else {
            const customLinks = rows.map((row) => ({
                randomShortVersion: row.randomName,
                endpoint: row.url,
                name: row.name,
                author: row.author,
            }));
            res.json(customLinks);
        }
    });
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
    db.get("SELECT url FROM links WHERE randomName = ?", [l], (err, row) => {
        if (err) {
            console.error("Error searching for link:", err.message);
            res.status(500).json({ error: "Failed to search for link." });
        } else if (row) {
            res.json({ url: row.url });
        } else {
            res.status(404).json({ error: "Link not found." });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
