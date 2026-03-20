import * as THREE from 'three';
import { createScene } from './scene.js';
import { createToken, removeToken, setupDrag, tokenMap } from './token.js';
import { Network } from './network.js';
import { loadMap, loadToken, loadMapFromBase64, loadTokenFromBase64, clearMap, removeLastToken } from './loader.js';

const { renderer, scene, camera, controls, updateBillboards, labelRenderer } = createScene();

const posDisplay = document.getElementById('pos-display');
const transformPanel = document.getElementById('transform-panel');
const inputX = document.getElementById('input-x');
const inputY = document.getElementById('input-y');
const inputZ = document.getElementById('input-z');
const inputRotY = document.getElementById('input-rot-y');
const inputScale = document.getElementById('input-scale');

let selectedToken = null;

// --- Painel de transformação ---

function selectToken(token) {
  selectedToken = token;
  transformPanel.style.display = 'block';
  updatePanelValues();
}

function deselectToken() {
  selectedToken = null;
  transformPanel.style.display = 'none';
}

function updatePanelValues() {
  if (!selectedToken) return;
  inputX.value = selectedToken.position.x.toFixed(2);
  inputY.value = selectedToken.position.y.toFixed(2);
  inputZ.value = selectedToken.position.z.toFixed(2);
  inputRotY.value = THREE.MathUtils.radToDeg(selectedToken.rotation.y).toFixed(0);
  inputScale.value = selectedToken.scale.x.toFixed(2);
}

function onAxisInput() {
  if (!selectedToken) return;
  selectedToken.position.x = parseFloat(inputX.value) || 0;
  selectedToken.position.y = parseFloat(inputY.value) || 0;
  selectedToken.position.z = parseFloat(inputZ.value) || 0;
  Network.emitTokenMove(selectedToken.name, {
    x: selectedToken.position.x,
    y: selectedToken.position.y,
    z: selectedToken.position.z
  });
}

function onRotationInput() {
  if (!selectedToken) return;
  const rad = THREE.MathUtils.degToRad(parseFloat(inputRotY.value) || 0);
  if (selectedToken.geometry && selectedToken.geometry.type === 'PlaneGeometry') {
    selectedToken.userData.rotationY = rad;
  } else {
    selectedToken.rotation.y = rad;
  }
  Network.emitTokenMove(selectedToken.name, {
    x: selectedToken.position.x,
    y: selectedToken.position.y,
    z: selectedToken.position.z,
    rotY: parseFloat(inputRotY.value) || 0,
    scale: parseFloat(inputScale.value) || 1
  });
}

function onScaleInput() {
  if (!selectedToken) return;
  const s = parseFloat(inputScale.value) || 1;
  selectedToken.scale.set(s, s, s);
  Network.emitTokenMove(selectedToken.name, {
    x: selectedToken.position.x,
    y: selectedToken.position.y,
    z: selectedToken.position.z,
    rotY: parseFloat(inputRotY.value) || 0,
    scale: s
  });
}

inputX.addEventListener('input', onAxisInput);
inputY.addEventListener('input', onAxisInput);
inputZ.addEventListener('input', onAxisInput);
inputRotY.addEventListener('input', onRotationInput);
inputScale.addEventListener('input', onScaleInput);
document.getElementById('btn-deselect').addEventListener('click', deselectToken);

// --- Rede ---
Network.init();

Network.onRoomError((msg) => {
  alert(msg);
  window.location.href = '/views/lobby.html';
});

// Sincronização ao entrar — recebe players + assets já na sala
Network.onSync((data) => {
  // Cria tokens de players
  data.players.forEach((playerData) => createToken(scene, playerData));

  // Atualiza HUD
  console.log(`Meu ID: ${Network.myId} | Sala: ${Network.roomCode}`);
  const roomCodeEl = document.getElementById('room-code');
  if (roomCodeEl) roomCodeEl.textContent = `🎲 ${Network.roomCode}`;

  // --- NOVO: carrega mapa existente na sala ---
  if (data.currentMap) {
    loadMapFromBase64(scene, data.currentMap.base64, data.currentMap.fileName);
  }

  // --- NOVO: carrega tokens já importados na sala ---
  if (data.tokens && data.tokens.length > 0) {
    data.tokens.forEach((t) => {
      loadTokenFromBase64(scene, t.base64, t.fileName, t.tokenId, {
        x: t.x, y: t.y, z: t.z,
        rotY: t.rotY,
        scale: t.scale
      });
    });
  }
});

Network.onPlayerJoined((playerData) => createToken(scene, playerData));
Network.onPlayerLeft((playerId) => removeToken(scene, playerId));

Network.onTokenMoved((data) => {
  const token = tokenMap.get(data.id);
  if (!token) return;
  token.position.set(data.x, data.y, data.z);
  if (data.scale !== undefined) token.scale.set(data.scale, data.scale, data.scale);
  if (data.rotY !== undefined) {
    const rad = THREE.MathUtils.degToRad(data.rotY);
    if (token.geometry && token.geometry.type === 'PlaneGeometry') {
      token.userData.rotationY = rad;
    } else {
      token.rotation.y = rad;
    }
  }
});

// --- NOVO: recebe mapa vindo da rede (outro player importou) ---
Network.onAssetMap(({ base64, fileName }) => {
  loadMapFromBase64(scene, base64, fileName);
});

// --- NOVO: recebe token vindo da rede (outro player importou) ---
Network.onAssetToken(({ base64, fileName, tokenId }) => {
  loadTokenFromBase64(scene, base64, fileName, tokenId);
});

// --- NOVO: recebe remoção de token da rede ---
Network.onTokenRemoved(({ tokenId }) => {
  const token = tokenMap.get(tokenId);
  if (!token) return;
  if (token.userData.shadow) scene.remove(token.userData.shadow);
  scene.remove(token);
  tokenMap.delete(tokenId);
  console.log('[Network] Token removido pela rede:', tokenId);
});

// --- Drag ---
setupDrag(scene, camera, renderer, controls, (id, position) => {
  Network.emitTokenMove(id, position);
  posDisplay.textContent =
    `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
  if (selectedToken && selectedToken.name === id) updatePanelValues();
}, (clickedToken) => {
  selectToken(clickedToken);
});

// --- Botões da Toolbar ---
const inputMapEl   = document.getElementById('input-map');
const inputTokenEl = document.getElementById('input-token');

document.getElementById('btn-import-map').addEventListener('click', () => inputMapEl.click());
document.getElementById('btn-import-token').addEventListener('click', () => inputTokenEl.click());

document.getElementById('btn-clear-map').addEventListener('click', () => clearMap(scene));

document.getElementById('btn-remove-token').addEventListener('click', () => {
  const removedId = removeLastToken(scene);
  if (removedId) {
    Network.emitTokenRemove(removedId);
  }
});

// --- NOVO: importar mapa — carrega local E emite para a sala ---
inputMapEl.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  inputMapEl.value = '';
  try {
    const base64 = await loadMap(scene, file);
    Network.emitAssetMap(base64, file.name);
    console.log('[Main] Mapa emitido para a sala:', file.name);
  } catch (err) {
    console.error('[Main] Falha ao emitir mapa:', err);
  }
});

// --- NOVO: importar token — carrega local E emite para a sala ---
inputTokenEl.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  inputTokenEl.value = '';
  try {
    const { base64, tokenId } = await loadToken(scene, file);
    Network.emitAssetToken(base64, file.name, tokenId);
    console.log('[Main] Token emitido para a sala:', file.name, tokenId);
  } catch (err) {
    console.error('[Main] Falha ao emitir token:', err);
  }
});

// --- Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateBillboards();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();