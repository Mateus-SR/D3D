const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB — para suportar .glb grandes
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function getOrCreateRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      players: new Map(),
      closeTimeout: null,
      currentMap: null,   // { base64, fileName }
      tokens: new Map()   // tokenId -> { base64, fileName, tokenId, x, y, z, rotY, scale }
    });
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

    // Envia estado completo — players + assets já na sala
    socket.emit('room:joined', {
      code,
      myId: socket.id,
      players: Array.from(room.players.values()),
      currentMap: room.currentMap || null,
      tokens: Array.from(room.tokens.values())
    });

    socket.to(code).emit('player:joined', player);
    console.log(`[Sala ${code}] ${playerName} entrou`);
  });

  // Mestre envia mapa — salva em RAM e rebroadcast
  socket.on('asset:map', ({ base64, fileName }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.currentMap = { base64, fileName };
    socket.to(currentRoom).emit('asset:map', { base64, fileName });
    console.log(`[Sala ${currentRoom}] Mapa: ${fileName} (${Math.round(base64.length * 0.75 / 1024)}KB)`);
  });

  // Alguém importa token — salva e rebroadcast
  socket.on('asset:token', ({ base64, fileName, tokenId }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.tokens.set(tokenId, { base64, fileName, tokenId, x: 0, y: 0.9, z: 0, rotY: 0, scale: 1 });
    socket.to(currentRoom).emit('asset:token', { base64, fileName, tokenId });
    console.log(`[Sala ${currentRoom}] Token: ${fileName} | ID: ${tokenId}`);
  });

  // Remover token da sala
  socket.on('token:remove', ({ tokenId }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.tokens.delete(tokenId);
    socket.to(currentRoom).emit('token:removed', { tokenId });
    console.log(`[Sala ${currentRoom}] Token removido: ${tokenId}`);
  });

  // Mover token — atualiza posição no estado da sala
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

    const assetToken = room.tokens.get(data.id);
    if (assetToken) {
      assetToken.x = data.x;
      assetToken.y = data.y;
      assetToken.z = data.z;
      if (data.rotY !== undefined) assetToken.rotY = data.rotY;
      if (data.scale !== undefined) assetToken.scale = data.scale;
    }

    socket.to(currentRoom).emit('token:moved', data);
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.players.delete(socket.id);
    io.to(currentRoom).emit('player:left', socket.id);

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