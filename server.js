const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(cors()); // ✅ Express 수준 CORS
const server = http.createServer(app);

// ✅ Socket.IO 수준 CORS
const io = new Server(server, {
  cors: {
    origin: "https://leehj67.github.io", // 정확하게 Pages 주소
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// ✅ 확인용 HTTP 경로
app.get("/", (req, res) => {
  res.send("Socket.IO server is alive.");
});

const rooms = {};

io.on('connection', (socket) => {
  console.log("✅ Socket connected:", socket.id);

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

  console.log(`▶️ ${socket.id} → 방 ${roomId}`);

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
    console.log("❌ 연결 종료:", socket.id);
    const idx = rooms[roomId]?.indexOf(socket);
    if (idx !== -1) rooms[roomId].splice(idx, 1);
    io.to(roomId).emit("opponent_disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
