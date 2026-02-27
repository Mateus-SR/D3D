import { createScene } from './scene.js';
import { createToken, removeToken, setupDrag, tokenMap } from './token.js';
import { Network } from './network.js';

const { renderer, scene, camera, controls } = createScene();

const posDisplay = document.getElementById('pos-display');

// 1. Recebe o estado inicial — cria um token pra cada player já conectado
Network.onSync((data) => {
  data.players.forEach((playerData) => {
    createToken(scene, playerData);
  });
  console.log(`Meu ID: ${Network.myId}`);
});

// 2. Novo player entrou — cria o token dele
Network.onPlayerJoined((playerData) => {
  createToken(scene, playerData);
  console.log(`[+] Player entrou: ${playerData.id}`);
});

// 3. Player saiu — remove o token dele
Network.onPlayerLeft((playerId) => {
  removeToken(scene, playerId);
  console.log(`[-] Player saiu: ${playerId}`);
});

// 4. Outro player moveu um token — atualiza posição na cena
Network.onTokenMoved((data) => {
  const token = tokenMap.get(data.id);
  if (token) {
    token.position.set(data.x, data.y, data.z);
  }
});

// 5. Drag local — envia pra rede e atualiza o HUD
setupDrag(scene, camera, renderer, controls, (id, position) => {
  Network.emitTokenMove(id, position);
  posDisplay.textContent =
    `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
});

// Loop de renderização
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();