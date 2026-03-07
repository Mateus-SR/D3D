const socket = io();

const urlParams = new URLSearchParams(window.location.search);

export const Network = {
  myId: null,
  roomCode: null,
  playerName: null,
  isMaster: false,

  init() {
    this.roomCode = urlParams.get('sala');
    this.playerName = urlParams.get('nome') || 'Anônimo';
    this.isMaster = urlParams.get('master') === 'true';

    if (!this.roomCode) {
      window.location.href = '/views/lobby.html';
      return;
    }

    socket.emit('room:enter', {
      code: this.roomCode,
      playerName: this.playerName,
      isMaster: this.isMaster
    });
  },

  onSync(callback) {
    socket.on('room:joined', (data) => {
      this.myId = socket.id;
      this.roomCode = data.code;
      callback(data);
    });
  },

  onPlayerJoined(callback) {
    socket.on('player:joined', callback);
  },

  onPlayerLeft(callback) {
    socket.on('player:left', callback);
  },

  onTokenMoved(callback) {
    socket.on('token:moved', callback);
  },

  onRoomError(callback) {
    socket.on('room:error', callback);
  },

  emitTokenMove(id, position) {
    socket.emit('token:move', {
      id,
      x: position.x,
      y: position.y,
      z: position.z,
      rotY: position.rotY,
      scale: position.scale
    });
  }
};