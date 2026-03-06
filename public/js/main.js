import * as THREE from 'three';
import { createScene } from './scene.js';
import { createToken, removeToken, setupDrag, tokenMap } from './token.js';
import { Network } from './network.js';
import { loadMap, loadToken, clearMap, removeLastToken } from './loader.js';

const { renderer, scene, camera, controls, updateBillboards } = createScene();

const posDisplay = document.getElementById('pos-display');
const transformPanel = document.getElementById('transform-panel');
const inputX = document.getElementById('input-x');
const inputY = document.getElementById('input-y');
const inputZ = document.getElementById('input-z');
const inputRotY = document.getElementById('input-rot-y');
const inputScale = document.getElementById('input-scale');

let selectedToken = null;

// --- Selecionar token ao clicar ---
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

// Quando o usuário edita um campo X, Y ou Z
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
  // Sprite 2D — salva no userData para o billboard respeitar
  if (selectedToken.geometry && selectedToken.geometry.type === 'PlaneGeometry') {
    selectedToken.userData.rotationY = rad;
  } else {
    // Cubo ou .glb — rotaciona diretamente
    selectedToken.rotation.y = rad;
  }
}

function onScaleInput() {
  if (!selectedToken) return;
  const s = parseFloat(inputScale.value) || 1;
  selectedToken.scale.set(s, s, s);
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

Network.onSync((data) => {
  data.players.forEach((playerData) => createToken(scene, playerData));
  console.log(`Meu ID: ${Network.myId} | Sala: ${Network.roomCode}`);
});

Network.onPlayerJoined((playerData) => createToken(scene, playerData));

Network.onPlayerLeft((playerId) => removeToken(scene, playerId));

Network.onTokenMoved((data) => {
  const token = tokenMap.get(data.id);
  if (token) {
    token.position.set(data.x, data.y, data.z);
    // Atualiza painel se esse token estiver selecionado
    if (selectedToken && selectedToken.name === data.id) {
      updatePanelValues();
    }
  }
});

// --- Drag ---
setupDrag(scene, camera, renderer, controls, (id, position) => {
  Network.emitTokenMove(id, position);
  posDisplay.textContent =
    `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;

  // Atualiza painel durante o drag
  if (selectedToken && selectedToken.name === id) {
    updatePanelValues();
  }
}, (clickedToken) => {
  // Callback de clique — seleciona o token
  selectToken(clickedToken);
});

// --- Botões da Toolbar ---
const inputMap   = document.getElementById('input-map');
const inputToken = document.getElementById('input-token');

document.getElementById('btn-import-map').addEventListener('click', () => inputMap.click());
document.getElementById('btn-import-token').addEventListener('click', () => inputToken.click());
document.getElementById('btn-remove-token').addEventListener('click', () => removeLastToken(scene));
document.getElementById('btn-clear-map').addEventListener('click', () => clearMap(scene));

inputMap.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) { loadMap(scene, file); inputMap.value = ''; }
});

inputToken.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) { loadToken(scene, file); inputToken.value = ''; }
});

// --- Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateBillboards();
  renderer.render(scene, camera);
}

animate();