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

function setupChat(server) {
  const wss = new WebSocketServer({ server, path: "/chat" });

  let onlines = 0;

  const broadcastMessage = (username, nickname, text) => {
    const msg = JSON.stringify({ type: "message", username, nickname, text });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  };

  const broadcastOnlineCount = () => {
    const msg = JSON.stringify({ type: "onlineCount", count: onlines });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  };

  wss.on("connection", (socket) => {
    console.log("Chat: new connection");
    onlines += 1;

    socket.send(
      JSON.stringify({
        type: "message",
        username: "server",
        nickname: "Server",
        text: "Welcome, you joined to the server!",
      }),
    );

    socket.on("message", (message) => {
      const data = JSON.parse(message.toString());

      if (data.type === "register") {
        db.get(
          "SELECT username FROM chat_users WHERE username = ?",
          [data.username],
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
                [data.username],
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
                    socket.username = data.username;
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

        console.log(`Chat message (${data.username}): ${data.text}`);
        broadcastMessage(data.username, data.nickname, data.text);
      }
    });

    socket.on("close", () => {
      onlines -= 1;
    });
  });

  console.log("Chat WebSocket server running at /chat");
}

module.exports = { setupChat };
