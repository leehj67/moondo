// 📦 Socket.IO 기반 실시간 듀얼 서버
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// 클라이언트 HTML 제공 (배포 시 필요 X)
app.use(express.static(path.join(__dirname, 'public')));

// 자동 방 관리
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
    console.log(`🎮 게임 시작: ${roomId}`);
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
    console.log('❌ 연결 종료:', socket.id);
    const idx = rooms[roomId]?.indexOf(socket);
    if (idx !== -1) rooms[roomId].splice(idx, 1);
    io.to(roomId).emit('opponent_disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
