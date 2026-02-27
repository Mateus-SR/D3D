const socket = io();

export const Network = {
  onSync(callback) {
    socket.on('state:sync', callback);
  },
  onTokenMoved(callback) {
    socket.on('token:moved', callback);
  },
  emitTokenMove(position) {
    socket.emit('token:move', position);
  }
};