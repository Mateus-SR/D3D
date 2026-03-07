const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getOrCreateRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { players: new Map(), closeTimeout: null });
  }
  return rooms.get(code);
}

function randomColor() {
  const colors = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);
  let currentRoom = null;
  let currentName = null;

  // Evento único de entrada — cria ou entra na sala
  socket.on('room:enter', ({ code, playerName, isMaster }) => {
    if (!rooms.has(code)) {
      if (isMaster) {
        getOrCreateRoom(code);
        console.log(`[Sala ${code}] Criada por ${playerName}`);
      } else {
        socket.emit('room:error', 'Sala não encontrada.');
        return;
      }
    }

    const room = rooms.get(code);

    // Cancela timer de fechamento se existir
    if (room.closeTimeout) {
      clearTimeout(room.closeTimeout);
      room.closeTimeout = null;
      console.log(`[Sala ${code}] Timer de fechamento cancelado`);
    }

    const player = {
      id: socket.id,
      name: playerName || 'Jogador',
      color: randomColor(),
      x: (Math.random() - 0.5) * 6,
      y: 0.5,
      z: (Math.random() - 0.5) * 6,
      isMaster
    };

    room.players.set(socket.id, player);
    socket.join(code);
    currentRoom = code;
    currentName = playerName;

    socket.emit('room:joined', {
      code,
      myId: socket.id,
      players: Array.from(room.players.values())
    });

    socket.to(code).emit('player:joined', player);
    console.log(`[Sala ${code}] ${playerName} entrou`);
  });

  // Mover token
  socket.on('token:move', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const player = room.players.get(data.id);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
    }

    socket.to(currentRoom).emit('token:moved', data);
  });

  // Desconexão
  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.players.delete(socket.id);
    io.to(currentRoom).emit('player:left', socket.id);

    // Sala vazia — fecha em 10 minutos
    if (room.players.size === 0) {
      room.closeTimeout = setTimeout(() => {
        rooms.delete(currentRoom);
        console.log(`[Sala ${currentRoom}] Removida após inatividade`);
      }, 10 * 60 * 1000);
      console.log(`[Sala ${currentRoom}] Vazia — fechando em 10 minutos`);
    }

    console.log(`[-] ${currentName} saiu da sala ${currentRoom}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎲 D3D Server rodando em http://localhost:${PORT}`);
});