const { WebSocketServer } = require("ws");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbsDir = path.join(__dirname, "..", "dbs");
if (!fs.existsSync(dbsDir)) {
  fs.mkdirSync(dbsDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbsDir, "chat.db"));

db.run(`CREATE TABLE IF NOT EXISTS chat_users (
    username TEXT PRIMARY KEY
)`);

const MAX_MESSAGE_LENGTH = 500;
const MAX_NICKNAME_LENGTH = 30;
const MAX_USERNAME_LENGTH = 30;

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupChat(server) {
  const wss = new WebSocketServer({ server, path: "/chat" });

  const broadcastMessage = (username, nickname, text) => {
    const msg = JSON.stringify({ type: "message", username, nickname, text });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  };

  const broadcastOnlineCount = () => {
    const count = wss.clients.size;
    const msg = JSON.stringify({ type: "onlineCount", count });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  };

  wss.on("connection", (socket) => {
    console.log("Chat: new connection");
    broadcastOnlineCount();

    socket.send(
      JSON.stringify({
        type: "message",
        username: "server",
        nickname: "Server",
        text: "Welcome, you joined to the server!",
      }),
    );

    socket.on("message", (message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        return;
      }

      if (data.type === "register") {
        const username = String(data.username || "").slice(0, MAX_USERNAME_LENGTH);
        if (!username) {
          socket.send(
            JSON.stringify({
              type: "register",
              success: false,
              message: "Username cannot be empty",
            }),
          );
          return;
        }

        db.get(
          "SELECT username FROM chat_users WHERE username = ?",
          [username],
          (err, row) => {
            if (err) {
              socket.send(
                JSON.stringify({
                  type: "register",
                  success: false,
                  message: "DB error",
                }),
              );
              return;
            }
            if (row) {
              socket.send(
                JSON.stringify({
                  type: "register",
                  success: false,
                  message: "Username already taken",
                }),
              );
            } else {
              db.run(
                "INSERT INTO chat_users(username) VALUES(?)",
                [username],
                (err) => {
                  if (err) {
                    socket.send(
                      JSON.stringify({
                        type: "register",
                        success: false,
                        message: "DB error",
                      }),
                    );
                  } else {
                    socket.username = username;
                    socket.send(
                      JSON.stringify({
                        type: "register",
                        success: true,
                        message: "Registration successful",
                      }),
                    );
                    broadcastOnlineCount();
                  }
                },
              );
            }
          },
        );
      } else if (data.type === "message") {
        if (!data.username) {
          socket.send(
            JSON.stringify({
              type: "message",
              username: "server",
              nickname: "Server",
              text: "You must register first!",
            }),
          );
          return;
        }
        if (!data.text || !data.username || !data.nickname) {
          socket.send(
            JSON.stringify({
              type: "message",
              username: "server",
              nickname: "Server",
              text: "Invalid message format!",
            }),
          );
          return;
        }

        const text = String(data.text).slice(0, MAX_MESSAGE_LENGTH);
        const nickname = String(data.nickname).slice(0, MAX_NICKNAME_LENGTH);
        const username = String(data.username).slice(0, MAX_USERNAME_LENGTH);

        broadcastMessage(
          escapeHtml(username),
          escapeHtml(nickname),
          escapeHtml(text),
        );
      }
    });

    socket.on("close", () => {
      broadcastOnlineCount();
    });
  });

  console.log("Chat WebSocket server running at /chat");
}

module.exports = { setupChat };
