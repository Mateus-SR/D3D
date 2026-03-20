const socket = io();

export const Network = {
  myId: null,
  roomCode: null,
  playerName: null,
  isMaster: false,

  init() {
    this.roomCode = sessionStorage.getItem('d3d_sala');
    this.playerName = sessionStorage.getItem('d3d_nome') || 'Anônimo';
    this.isMaster = sessionStorage.getItem('d3d_master') === 'true';

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

  onTokenRemoved(callback) {
    socket.on('token:removed', callback);
  },

  onRoomError(callback) {
    socket.on('room:error', callback);
  },

  // --- NOVO: assets ---

  // Emite mapa para a sala (base64 do arquivo .glb/.gltf)
  emitAssetMap(base64, fileName) {
    socket.emit('asset:map', { base64, fileName });
  },

  // Emite token para a sala (base64 do PNG ou .glb)
  emitAssetToken(base64, fileName, tokenId) {
    socket.emit('asset:token', { base64, fileName, tokenId });
  },

  // Emite remoção de token
  emitTokenRemove(tokenId) {
    socket.emit('token:remove', { tokenId });
  },

  // Recebe mapa vindo da rede
  onAssetMap(callback) {
    socket.on('asset:map', callback);
  },

  // Recebe token vindo da rede
  onAssetToken(callback) {
    socket.on('asset:token', callback);
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