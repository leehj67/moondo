const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://leehj67.github.io",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const rooms = {};

io.on('connection', (socket) => {
  console.log('✅ 연결:', socket.id);

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
    console.log("❌ 종료:", socket.id);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(s => s.id !== socket.id);
      io.to(roomId).emit("opponent_disconnected");
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: ${PORT}`);
});
