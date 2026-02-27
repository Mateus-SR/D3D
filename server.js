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

const gameState = {
  token: { x: 0, y: 0.5, z: 0 }
};

io.on('connection', (socket) => {
  console.log(`[+] Cliente conectado: ${socket.id}`);

  socket.emit('state:sync', gameState);

  socket.on('token:move', (position) => {
    if (
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      typeof position.z !== 'number'
    ) return;

    gameState.token = position;
    socket.broadcast.emit('token:moved', position);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Cliente desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎲 D3D Server rodando em http://localhost:${PORT}`);
});