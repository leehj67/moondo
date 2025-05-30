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
    origin: "https://leehj67.github.io",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ 접속:", socket.id);

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

  socket.on("disconnect", () => {
    console.log("❌ 연결 종료:", socket.id);
    const idx = rooms[roomId]?.findIndex(p => p.id === socket.id);
    if (idx !== -1) rooms[roomId].splice(idx, 1);
    socket.to(roomId).emit("opponent_disconnected");
  });
});

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
