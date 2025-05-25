const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ✅ CORS 허용 설정: GitHub Pages 출처 허용
const io = new Server(server, {
  cors: {
    origin: "https://leehj67.github.io", // ← 너의 GitHub Pages 주소 정확히!
    methods: ["GET", "POST"]
  }
});

// ✅ express에도 CORS 적용
app.use(cors());

app.get("/", (req, res) => {
  res.send("Socket.IO server is running.");
});

app.get("/socket.io/", (req, res) => {
  res.send("Socket.IO endpoint active");
});

const PORT = process.env.PORT || 3000;

// 방 관리
const rooms = {};

io.on('connection', (socket) => {
  console.log('✅ 접속:', socket.id);

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
    io.to(roomId).emit('game_start');
  }

  socket.on('player_action', (data) => {
    socket.to(roomId).emit('opponent_action', data);
  });

  socket.on('spawn_axe', (data) => {
    socket.to(roomId).emit('opponent_axe', data);
  });

  socket.on('hit', (damage) => {
    socket.to(roomId).emit('take_damage', damage);
  });

  socket.on('disconnect', () => {
    const idx = rooms[roomId]?.indexOf(socket);
    if (idx !== -1) rooms[roomId].splice(idx, 1);
    io.to(roomId).emit('opponent_disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
