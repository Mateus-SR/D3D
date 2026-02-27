import { createScene } from './scene.js';
import { createToken, setupDrag } from './token.js';
import { Network } from './network.js';

const { renderer, scene, camera, controls } = createScene();
const token = createToken(scene);

const posDisplay = document.getElementById('pos-display');

Network.onSync((state) => {
  token.position.set(state.token.x, state.token.y, state.token.z);
});

Network.onTokenMoved((position) => {
  token.position.set(position.x, position.y, position.z);
});

setupDrag(token, camera, renderer, controls, (position) => {
  Network.emitTokenMove(position);
  posDisplay.textContent =
    `Pos: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();