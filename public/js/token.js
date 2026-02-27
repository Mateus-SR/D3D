import * as THREE from 'three';

export function createToken(scene) {
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const material = new THREE.MeshStandardMaterial({
    color: 0x7eb8f7,
    roughness: 0.4,
    metalness: 0.3,
  });
  const token = new THREE.Mesh(geometry, material);
  token.position.set(0, 0.5, 0);
  token.castShadow = true;
  token.name = 'token';
  scene.add(token);
  return token;
}

export function setupDrag(token, camera, renderer, orbitControls, onMoveCallback) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dragPoint = new THREE.Vector3();
  let isDragging = false;
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
    const hits = raycaster.intersectObject(token);
    if (hits.length > 0) {
      isDragging = true;
      orbitControls.enabled = false;
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      dragOffset.subVectors(token.position, dragPoint);
      dragOffset.y = 0;
    }
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    getPointer(event);
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    token.position.x = dragPoint.x + dragOffset.x;
    token.position.z = dragPoint.z + dragOffset.z;
    token.position.y = 0.5;
    onMoveCallback({ x: token.position.x, y: token.position.y, z: token.position.z });
  }

  function onPointerUp() {
    if (isDragging) {
      isDragging = false;
      orbitControls.enabled = true;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
}