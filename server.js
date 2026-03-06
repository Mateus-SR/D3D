const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// Map de salas: chave = código da sala, valor = { players: Map }
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
    rooms.set(code, { players: new Map() });
  }
  return rooms.get(code);
}

io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);
  let currentRoom = null;
  let currentName = null;

  // 1. Criar sala
  socket.on('room:create', (playerName) => {
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode(); // garante código único

    const room = getOrCreateRoom(code);
    const player = {
      id: socket.id,
      name: playerName || 'Mestre',
      color: randomColor(),
      x: 0, y: 0.5, z: 0,
      isMaster: true
    };

    room.players.set(socket.id, player);
    socket.join(code);
    currentRoom = code;
    currentName = playerName;

    socket.emit('room:created', {
      code,
      myId: socket.id,
      players: Array.from(room.players.values())
    });

    console.log(`[Sala ${code}] Criada por ${playerName}`);
  });

  // 2. Entrar numa sala existente
  socket.on('room:join', ({ code, playerName }) => {
    const room = rooms.get(code);

    if (!room) {
      socket.emit('room:error', 'Sala não encontrada.');
      return;
    }

    const player = {
      id: socket.id,
      name: playerName || 'Jogador',
      color: randomColor(),
      x: (Math.random() - 0.5) * 6,
      y: 0.5,
      z: (Math.random() - 0.5) * 6,
      isMaster: false
    };

    room.players.set(socket.id, player);
    socket.join(code);
    currentRoom = code;
    currentName = playerName;

    // Manda estado atual para o novo jogador
    socket.emit('room:joined', {
      code,
      myId: socket.id,
      players: Array.from(room.players.values())
    });

    // Avisa os outros que alguém entrou
    socket.to(code).emit('player:joined', player);
    console.log(`[Sala ${code}] ${playerName} entrou`);
  });

// 2.5. Reconectar na sala após redirect
socket.on('room:rejoin', ({ code, playerName }) => {
  const room = rooms.get(code);

  if (!room) {
    socket.emit('room:error', 'Sala não encontrada.');
   return;
  }

  const player = {
    id: socket.id,
    name: playerName || 'Jogador',
    color: randomColor(),
    x: (Math.random() - 0.5) * 6,
    y: 0.5,
    z: (Math.random() - 0.5) * 6,
    isMaster: false
  };

  room.players.set(socket.id, player);
  socket.join(code);
  currentRoom = code;
  currentName = playerName;

  socket.emit('room:rejoined', {
    code,
    myId: socket.id,
    players: Array.from(room.players.values())
  });

  socket.to(code).emit('player:joined', player);
  console.log(`[Sala ${code}] ${playerName} reconectou`);
});

  // 3. Mover token
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

  // 4. Desconexão
  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.players.delete(socket.id);
    io.to(currentRoom).emit('player:left', socket.id);

    // Remove sala se vazia
    if (room.players.size === 0) {
      rooms.delete(currentRoom);
      console.log(`[Sala ${currentRoom}] Removida (vazia)`);
    }

    console.log(`[-] ${currentName} saiu da sala ${currentRoom}`);
  });
});

function randomColor() {
  const colors = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎲 D3D Server rodando em http://localhost:${PORT}`);
});