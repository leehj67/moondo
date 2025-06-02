// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

const units = [];

// 각 유닛의 기본 스탯 정의
const unitStats = {
  tv_girl: { speed: 1, hp: 5, atk: 1 },
  enemy_bot: { speed: 0.5, hp: 8, atk: 2 },
  punch: { speed: 1.5, hp: 2, atk: 3 },
  boss: { speed: 0.3, hp: 20, atk: 5 },
};

// 초기 좌표 세팅 (아군 유닛은 하단, 적군은 상단)
function getInitialPosition(type) {
  if (type === 'enemy_bot' || type === 'boss') {
    return { x: Math.random() * 700 + 50, y: 0, direction: 'down' };
  } else {
    return { x: Math.random() * 700 + 50, y: 350, direction: 'up' };
  }
}

io.on('connection', (socket) => {
  console.log('✅ 사용자 연결:', socket.id);

  socket.on('spawn', ({ type }) => {
    if (!unitStats[type]) return;
    const pos = getInitialPosition(type);
    units.push({
      id: socket.id + '_' + Date.now(),
      type,
      x: pos.x,
      y: pos.y,
      direction: pos.direction,
      ...unitStats[type],
    });
    console.log('📦 유닛 소환:', type);
  });

  socket.on('disconnect', () => {
    console.log('❌ 사용자 연결 종료:', socket.id);
  });
});

// 유닛 이동 처리 루프
setInterval(() => {
  for (const unit of units) {
    if (unit.direction === 'up') {
      unit.y -= unit.speed;
    } else {
      unit.y += unit.speed;
    }
  }
  io.emit('state', units);
}, 100);

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
