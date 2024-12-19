import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
// import agoraService from "./server/agora.js";
import bodyParser from "body-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = {};

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static("public"));
// Serve static files with correct MIME type
// app.use(
//   express.static(path.join(__dirname, "public"), {
//     setHeaders: (res, path) => {
//       if (path.endsWith(".js")) {
//         res.setHeader("Content-Type", "application/javascript");
//       }
//       if (path.endsWith(".ts")) {
//         res.setHeader("Content-Type", "application/javascript");
//       }
//     },
//   })
// );

// Serve different HTML based on room query
app.get("/", (req, res) => {
  const roomId = req.query.room;
  if (!roomId) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.redirect("/r");
  }
});
app.get("/r", (req, res) => {
  const roomId = req.query.room;
  if (roomId) {
    res.sendFile(path.join(__dirname, "public", "r.html"));
  } else {
    res.redirect("/");
  }
});

// WebSocket connection
wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const roomId = urlParams.get("room");

  if (!rooms[roomId]) {
    rooms[roomId] = [];
  }
  rooms[roomId].push(ws);

  ws.on("message", async (message) => {
    try {
      const messageStr = message.toString();
      console.log(messageStr);
      const messageData = JSON.parse(messageStr);
      if (messageData.type === "text") {
        // Handle text messages
        rooms[roomId].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            //client !== ws &&
            client.send(messageStr);
          }
        });
      }
    } catch (error) {
      console.error("Message processing error:", error);
      // Handle plain text messages as fallback
      rooms[roomId].forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    }
  });

  ws.on("close", () => {
    rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
