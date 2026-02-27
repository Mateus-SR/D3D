const socket = io();

export const Network = {
  // Meu ID único dado pelo servidor
  myId: null,

  onSync(callback) {
    socket.on('state:sync', (data) => {
      this.myId = data.myId;
      callback(data);
    });
  },

  // Um novo player entrou
  onPlayerJoined(callback) {
    socket.on('player:joined', callback);
  },

  // Um player saiu
  onPlayerLeft(callback) {
    socket.on('player:left', callback);
  },

  // Outro player moveu um token
  onTokenMoved(callback) {
    socket.on('token:moved', callback);
  },

  // Envia movimento de qualquer token (meu ou de outro)
  emitTokenMove(id, position) {
    socket.emit('token:move', {
      id,
      x: position.x,
      y: position.y,
      z: position.z
    });
  }
};