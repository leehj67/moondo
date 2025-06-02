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

const rooms = {}; // for 가위바위보
const units = []; // for 타우디펜스

// 유니트 스택
const unitStats = {
  tv_girl: { speed: 1, hp: 5, atk: 1 },
  enemy_bot: { speed: 0.5, hp: 8, atk: 2 },
  punch: { speed: 1.5, hp: 2, atk: 3 },
  boss: { speed: 0.3, hp: 20, atk: 5 },
};

function getInitialPosition(type) {
  if (type === 'enemy_bot' || type === 'boss') {
    return { x: Math.random() * 700 + 50, y: 0, direction: 'down' };
  } else {
    return { x: Math.random() * 700 + 50, y: 350, direction: 'up' };
  }
}

// WebSocket 연결
io.on("connection", (socket) => {
  console.log("✅ 연결:", socket.id);

  // 기지가위바위보
  let roomId = null;
  for (const id in rooms) {
    if (rooms[id].length < 2) {
      roomId = id;
      break;
    }
  }
  if (!roomId) roomId = socket.id;
  if (!rooms[roomId]) rooms[roomId] = [];

  rooms[roomId].push({ id: socket.id, socket, move: null });
  socket.roomId = roomId;
  socket.join(roomId);

  if (rooms[roomId].length === 2) {
    io.to(roomId).emit("game_start");
  } else {
    socket.emit("waiting");
  }

  socket.on("player_move", (move) => {
    const player = rooms[roomId]?.find(p => p.id === socket.id);
    if (player) player.move = move;

    const [p1, p2] = rooms[roomId];
    if (p1?.move && p2?.move) {
      const result = judge(p1.move, p2.move);
      p1.socket.emit("round_result", explain(result === 1 ? "승리" : result === 0 ? "무승부" : "패배", p1.move, p2.move));
      p2.socket.emit("round_result", explain(result === -1 ? "승리" : result === 0 ? "무승부" : "패배", p2.move, p1.move));
      p1.move = null;
      p2.move = null;
    }
  });

  // 타우디펜스 유니트 소환
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
    console.log('📦 유니트 소환:', type);
  });

  socket.on("disconnect", () => {
    console.log("❌ 연결 종료:", socket.id);
    const idx = rooms[socket.roomId]?.findIndex(p => p.id === socket.id);
    if (idx !== -1) rooms[socket.roomId].splice(idx, 1);
    socket.to(socket.roomId).emit("opponent_disconnected");
  });
});

// 유니트 이동 루프
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

function judge(m1, m2) {
  const beats = { rock: "scissors", scissors: "paper", paper: "rock" };
  if (m1 === m2) return 0;
  return beats[m1] === m2 ? 1 : -1;
}

function explain(result, myMove, oppMove) {
  return `${result}! (내: ${emoji(myMove)} vs 상대: ${emoji(oppMove)})`;
}

function emoji(move) {
  return move === "rock" ? "✊" : move === "paper" ? "✋" : "✌";
}

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
