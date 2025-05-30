const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 개발 단계에서는 전체 허용
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ 연결됨:", socket.id);

  let roomId = null;

  // 빈 방이 있으면 연결
  for (const id in rooms) {
    if (rooms[id].length < 2) {
      roomId = id;
      break;
    }
  }

  // 없다면 새 방 생성
  if (!roomId) roomId = socket.id;
  if (!rooms[roomId]) rooms[roomId] = [];

  rooms[roomId].push(socket);
  socket.roomId = roomId;
  socket.join(roomId);

  if (rooms[roomId].length === 2) {
    io.to(roomId).emit("game_start");
    console.log(`🎮 게임 시작! 방: ${roomId}`);
  }

  socket.on("choice", (data) => {
    socket.choice = data.choice;

    const opponent = rooms[roomId].find(s => s.id !== socket.id);
    if (opponent && opponent.choice) {
      // 둘 다 선택을 마쳤다면 결과 계산
      const result = calculateResult(socket.choice, opponent.choice);
      io.to(roomId).emit("turn_result", {
        p1: socket.choice,
        p2: opponent.choice,
        result: result
      });

      // choice 초기화
      socket.choice = null;
      opponent.choice = null;
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ 연결 종료:", socket.id);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(s => s.id !== socket.id);
      io.to(roomId).emit("opponent_disconnected");
    }
  });
});

function calculateResult(p1, p2) {
  const winMap = {
    rock: "scissors",
    scissors: "paper",
    paper: "rock"
  };
  if (p1 === p2) return "draw";
  if (winMap[p1] === p2) return "p1";
  return "p2";
}

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
