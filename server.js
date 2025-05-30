// ✅ server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "https://leehj67.github.io",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const rooms = {}; // { roomId: [socket1, socket2] }

io.on("connection", (socket) => {
  let roomId = null;

  for (const id in rooms) {
    if (rooms[id].length < 2) {
      roomId = id;
      break;
    }
  }
  if (!roomId) roomId = socket.id;
  if (!rooms[roomId]) rooms[roomId] = [];

  rooms[roomId].push(socket);
  socket.roomId = roomId;
  socket.join(roomId);

  const isFirst = rooms[roomId].length === 1;
  socket.emit("assign_side", isFirst ? "bottom" : "top");

  if (rooms[roomId].length === 2) {
    io.to(roomId).emit("game_start");
  }

  socket.on("player_action", (data) => {
    socket.to(roomId).emit("opponent_action", data);
  });

  socket.on("spawn_axe", (data) => {
    socket.to(roomId).emit("opponent_axe", data);
  });

  socket.on("hit", (damage) => {
    socket.to(roomId).emit("take_damage", damage);
  });

  socket.on("disconnect", () => {
    const idx = rooms[roomId]?.indexOf(socket);
    if (idx !== -1) rooms[roomId].splice(idx, 1);
    io.to(roomId).emit("opponent_disconnected");
  });
});

server.listen(PORT, () => {
  console.log(` Listening on port ${PORT}`);
});
