import { createScene } from './scene.js';
import { createToken, removeToken, setupDrag, tokenMap } from './token.js';
import { Network } from './network.js';
import { loadMap, loadToken, clearMap, removeLastToken } from './loader.js';

const { renderer, scene, camera, controls } = createScene();

const posDisplay = document.getElementById('pos-display');

// --- Rede ---
Network.onSync((data) => {
  data.players.forEach((playerData) => {
    createToken(scene, playerData);
  });
  console.log(`Meu ID: ${Network.myId}`);
});

Network.onPlayerJoined((playerData) => {
  createToken(scene, playerData);
});

Network.onPlayerLeft((playerId) => {
  removeToken(scene, playerId);
});

Network.onTokenMoved((data) => {
  const token = tokenMap.get(data.id);
  if (token) {
    token.position.set(data.x, data.y, data.z);
  }
});

// --- Drag ---
setupDrag(scene, camera, renderer, controls, (id, position) => {
  Network.emitTokenMove(id, position);
  posDisplay.textContent =
    `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
});

// --- Botões da Toolbar ---
const inputMap   = document.getElementById('input-map');
const inputToken = document.getElementById('input-token');

document.getElementById('btn-import-map').addEventListener('click', () => {
  inputMap.click();
});

document.getElementById('btn-import-token').addEventListener('click', () => {
  inputToken.click();
});

document.getElementById('btn-remove-token').addEventListener('click', () => {
  removeLastToken(scene);
});

document.getElementById('btn-clear-map').addEventListener('click', () => {
  clearMap(scene);
});

inputMap.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    loadMap(scene, file);
    inputMap.value = ''; // permite reimportar o mesmo arquivo
  }
});

inputToken.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    loadToken(scene, file);
    inputToken.value = '';
  }
});

// --- Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();