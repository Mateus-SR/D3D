const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// Agora o estado guarda UM token por player (chave = socket.id)
const players = new Map();

function randomColor() {
  const colors = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
  console.log(`[+] Player conectado: ${socket.id}`);

  // Cria o token desse player
  const newPlayer = {
    id: socket.id,
    color: randomColor(),
    x: (Math.random() - 0.5) * 8, // spawn aleatório no grid
    y: 0.5,
    z: (Math.random() - 0.5) * 8
  };

  // Salva no Map
  players.set(socket.id, newPlayer);

  // 1. Manda para o novo player: seu próprio ID + todos os players existentes
  socket.emit('state:sync', {
    myId: socket.id,
    players: Array.from(players.values())
  });

  // 2. Avisa todos os OUTROS que um novo player entrou
  socket.broadcast.emit('player:joined', newPlayer);

  // 3. Escuta movimento de qualquer token
  socket.on('token:move', (data) => {
    // data = { id, x, y, z } — qualquer player pode mover qualquer token
    const player = players.get(data.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.z = data.z;

    // Rebroadcast para os outros
    socket.broadcast.emit('token:moved', data);
  });

  // 4. Player saiu — remove o token
  socket.on('disconnect', () => {
    console.log(`[-] Player desconectado: ${socket.id}`);
    players.delete(socket.id);
    io.emit('player:left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎲 D3D Server rodando em http://localhost:${PORT}`);
});