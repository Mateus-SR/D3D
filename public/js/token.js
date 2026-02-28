import * as THREE from 'three';

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
  scene.add(token);
  tokenMap.set(playerData.id, token);
  return token;
}

export function removeToken(scene, playerId) {
  const token = tokenMap.get(playerId);
  if (!token) return;
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

export function setupDrag(scene, camera, renderer, orbitControls, onMoveCallback) {
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
    draggedToken.position.y = 0.5;

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