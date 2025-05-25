const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://leehj67.github.io", // 👉 너의 GitHub Pages 주소
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const rooms = {};

app.get("/", (req, res) => {
  res.send("Socket.IO server is running");
});

io.on('connection', (socket) => {
  console.log('✅ 접속:', socket.id);

  // 1. 빈 방 찾기
  let roomId = null;
  for (const id in rooms) {
    if (rooms[id].length < 2) {
      roomId = id;
      break;
    }
  }

  // 2. 새 방 만들기
  if (!roomId) roomId = socket.id;
  if (!rooms[roomId]) rooms[roomId] = [];

  // 3. 방이 꽉 찼다면 접속 종료
  if (rooms[roomId].length >= 2) {
    socket.emit('full_room');
    socket.disconnect(true);
    return;
  }

  // 4. 입장
  rooms[roomId].push(socket);
  socket.roomId = roomId;
  socket.join(roomId);
  console.log(`▶️ ${socket.id} → 방 ${roomId}`);

  if (rooms[roomId].length === 2) {
    io.to(roomId).emit("game_start");
    console.log(`🎮 게임 시작: ${roomId}`);
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
