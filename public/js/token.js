import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const tokenMap = new Map();

export function createToken(scene, playerData) {
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const material = new THREE.MeshStandardMaterial({
    color: playerData.color,
    roughness: 0.4,
    metalness: 0.3,
  });
  const token = new THREE.Mesh(geometry, material);
  token.position.set(playerData.x, playerData.y, playerData.z);
  token.castShadow = true;
  token.name = playerData.id;

  // Label com nome do player
  const labelDiv = document.createElement('div');
  labelDiv.textContent = playerData.name || 'Jogador';
  labelDiv.style.cssText = `
    background: rgba(0,0,0,0.6);
    color: #a0c4ff;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    border: 1px solid #2a4a8a;
    white-space: nowrap;
    pointer-events: none;
  `;
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 0.8, 0); // acima do cubo
  token.add(label);

  scene.add(token);
  tokenMap.set(playerData.id, token);
  return token;
}

export function removeToken(scene, playerId) {
  const token = tokenMap.get(playerId);
  if (!token) return;

  // Remove labels CSS2D filhos
  token.traverse((child) => {
    if (child.isCSS2DObject) {
      child.element.remove();
    }
  });

  scene.remove(token);
  token.geometry?.dispose();
  token.material?.dispose();
  tokenMap.delete(playerId);
}

// Sobe na hierarquia do objeto até achar a raiz que está no tokenMap
function findTokenRoot(object) {
  let current = object;
  while (current) {
    for (const [id, token] of tokenMap.entries()) {
      if (token === current) return token;
    }
    current = current.parent;
  }
  return null;
}

export function setupDrag(scene, camera, renderer, orbitControls, onMoveCallback, onClickCallback) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dragPoint = new THREE.Vector3();
  let draggedToken = null;
  let dragOffset = new THREE.Vector3();
  const canvas = renderer.domElement;

  function getPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerDown(event) {
    getPointer(event);
    raycaster.setFromCamera(pointer, camera);

    const allTokens = Array.from(tokenMap.values());

    // true = checa filhos recursivamente (essencial para .glb)
    const hits = raycaster.intersectObjects(allTokens, true);

    if (hits.length > 0) {
      // Sobe na hierarquia para achar a raiz do token
      const root = findTokenRoot(hits[0].object);
      if (!root) return;

      draggedToken = root;
      orbitControls.enabled = false;
      if (onClickCallback) onClickCallback(root);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      dragOffset.subVectors(draggedToken.position, dragPoint);
      dragOffset.y = 0;
    }
  }

  function onPointerMove(event) {
    if (!draggedToken) return;
    getPointer(event);
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);

    draggedToken.position.x = dragPoint.x + dragOffset.x;
    draggedToken.position.z = dragPoint.z + dragOffset.z;

    onMoveCallback(draggedToken.name, {
      x: draggedToken.position.x,
      y: draggedToken.position.y,
      z: draggedToken.position.z
    });
  }

  function onPointerUp() {
    if (draggedToken) {
      draggedToken = null;
      orbitControls.enabled = true;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
}