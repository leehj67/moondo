// ==== server.js (서버 파일) ====
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// 실시간 게임 상태 저장
let gameState = {
  units: [] // 모든 유닛 정보 (id, owner, x, y, hp, type)
};

// 새 유닛 소환 시 처리
io.on('connection', (socket) => {
  console.log('✅ 유저 접속:', socket.id);

  socket.on('spawn_unit', (unitData) => {
    const unit = {
      id: Date.now() + '_' + Math.random(),
      ...unitData
    };
    gameState.units.push(unit);
    io.emit('unit_spawned', unit); // 전체 유저에 전파
  });

  socket.on('request_sync', () => {
    socket.emit('full_state', gameState);
  });

  socket.on('disconnect', () => {
    console.log('❌ 연결 종료:', socket.id);
  });
});

// 서버 실행
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});