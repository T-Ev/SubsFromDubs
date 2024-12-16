import express, { Router } from "express";
import http from "http";
// import { WebSocketServer } from "ws";
import { pipeline } from "@xenova/transformers";
import path from "path";
import { fileURLToPath } from "url";
// import agoraService from "./server/agora.js";
import bodyParser from "body-parser";
import serverless from "serverless-http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

const rooms = {};

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static("public"));
// Serve static files with correct MIME type

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
let sse_clients = [];
const sendAll = (message, room) => {
  console.log(message, room, sse_clients);
  sse_clients[room].forEach((client) => client.c.write("data: " + JSON.stringify(message) + "\n\n"));
};
const api = Router();
api.get("/events", (req, res) => {
  const room = req.query.room;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    c: res,
  };
  if (!sse_clients[room]) sse_clients[room] = [];
  sse_clients[room].push(newClient);
  console.log("EVENT", room);
  // Send an initial event
  res.write(`data: {"type":"initial", "data": "Connection established", id:${clientId}}\n\n`);

  // Handle client disconnect
  req.on("close", () => {
    sse_clients[room] = sse_clients[room].filter((client) => client.id !== clientId);
    res.end();
  });
});

api.post("/dub", (req, res) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const roomId = urlParams.get("room");
  console.log("DUBS");
  try {
    const messageData = req.body;
    if (messageData.type === "text") {
      // Handle text messages
      sendAll(messageData, roomId);
    }
    res.send("complete");
  } catch (error) {
    console.error("Message processing error:", error);
    console.log(sse_clients);
    res.send("error");
  }
});
api.get("/echo", (req, res) => {
  res.send("echo");
});
app.use("/api", api);

//netlify
export const handler = serverless(app);

//module.exports.handler = serverless(app);

// // WebSocket connection
// wss.on("connection", (ws, req) => {
//   const urlParams = new URLSearchParams(req.url.split("?")[1]);
//   const roomId = urlParams.get("room");

//   if (!rooms[roomId]) {
//     rooms[roomId] = [];
//   }
//   rooms[roomId].push(ws);

//   ws.on("message", async (message) => {
//     try {
//       const messageStr = message.toString();
//       console.log(messageStr);
//       const messageData = JSON.parse(messageStr);
//       if (messageData.type === "text") {
//         // Handle text messages
//         rooms[roomId].forEach((client) => {
//           if (client.readyState === WebSocket.OPEN) {
//             //client !== ws &&
//             client.send(messageStr);
//           }
//         });
//       }
//     } catch (error) {
//       console.error("Message processing error:", error);
//       // Handle plain text messages as fallback
//       rooms[roomId].forEach((client) => {
//         if (client !== ws && client.readyState === WebSocket.OPEN) {
//           client.send(message.toString());
//         }
//       });
//     }
//   });

//   ws.on("close", () => {
//     rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
//   });
// });

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
