// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

const rooms = {};

function tossCoin() {
  return Math.random() < 0.5;
}

function getOpponent(roomId, id) {
  return rooms[roomId].find(p => p.id !== id);
}

io.on("connection", (socket) => {
  console.log("✅ 연결:", socket.id);

  let roomId = null;
  for (const id in rooms) {
    if (rooms[id].length < 2) {
      roomId = id;
      break;
    }
  }
  if (!roomId) roomId = socket.id;
  if (!rooms[roomId]) rooms[roomId] = [];

  rooms[roomId].push({ id: socket.id, socket, role: null, hp: 3 });
  socket.roomId = roomId;
  socket.join(roomId);

  if (rooms[roomId].length === 2) {
    const first = tossCoin();
    const [p1, p2] = rooms[roomId];
    if (first) {
      p1.role = 'attack';
      p2.role = 'defend';
    } else {
      p1.role = 'defend';
      p2.role = 'attack';
    }
    p1.socket.emit("game_start", { first: p1.role === 'attack' });
    p2.socket.emit("game_start", { first: p2.role === 'attack' });
    setTimeout(() => {
      p1.socket.emit("your_turn", { role: p1.role });
      p2.socket.emit("your_turn", { role: p2.role });
    }, 500);
  } else {
    socket.emit("waiting");
  }

  socket.on("player_action", ({ action }) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    const player = room.find(p => p.id === socket.id);
    const opponent = getOpponent(socket.roomId, socket.id);
    if (!player || !opponent) return;

    player.choice = action;

    if (opponent.choice !== undefined) {
      resolveTurn(room);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ 연결 종료:", socket.id);
    const room = rooms[socket.roomId];
    if (room) {
      const idx = room.findIndex(p => p.id === socket.id);
      if (idx !== -1) room.splice(idx, 1);
    }
    socket.to(socket.roomId).emit("opponent_disconnected");
  });
});

function resolveTurn(room) {
  const [p1, p2] = room;
  const attacker = p1.role === 'attack' ? p1 : p2;
  const defender = p1.role === 'defend' ? p1 : p2;

  let msg = '';
  let result = '';

  if (!attacker.choice) {
    msg = '공격자가 선택하지 않아 턴이 넘겨졌습니다.';
    result = 'none';
  } else if (!defender.choice) {
    defender.hp--;
    msg = `방어자가 선택하지 않아 공격 성공! 방어자 HP -1 (남은 HP: ${defender.hp})`;
    result = 'hit';
  } else if (attacker.choice === defender.choice) {
    msg = `방어 성공! 공격이 막혔습니다.`;
    result = 'guard';
  } else {
    defender.hp--;
    msg = `공격 성공! 방어자 HP -1 (남은 HP: ${defender.hp})`;
    result = 'hit';
  }

  p1.socket.emit("turn_result", { msg, result });
  p2.socket.emit("turn_result", { msg, result });

  p1.socket.emit("hp_update", { my: p1.hp, enemy: p2.hp });
  p2.socket.emit("hp_update", { my: p2.hp, enemy: p1.hp });

  if (defender.hp <= 0) {
    attacker.socket.emit("turn_result", { msg: "🎉 당신이 승리했습니다!", result: 'win' });
    defender.socket.emit("turn_result", { msg: "💀 패배했습니다...", result: 'lose' });
    return;
  }

  delete p1.choice;
  delete p2.choice;

  // 턴 유지: 공격 성공 시 역할 유지, 방어 성공 시 교체
  if (result === 'guard') {
    [p1.role, p2.role] = [p2.role, p1.role];
  }

  setTimeout(() => {
    p1.socket.emit("your_turn", { role: p1.role });
    p2.socket.emit("your_turn", { role: p2.role });
  }, 1000);
}

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
