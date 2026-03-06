import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tokenMap } from './token.js';

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.bias = -0.0001;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8, 10);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.1;

  const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
  dirLight.position.set(8, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(20, 20, 0x4444aa, 0x333366);
  scene.add(gridHelper);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Billboard: faz sprites 2D sempre olharem pra câmera
  // Chamado a cada frame pelo loop de animação
  function updateBillboards() {
  for (const [id, token] of tokenMap.entries()) {
    if (token.geometry && token.geometry.type === 'PlaneGeometry') {
      const userRotY = token.userData.rotationY || 0;
      const angleY = Math.atan2(
        camera.position.x - token.position.x,
        camera.position.z - token.position.z
      );

      const camHeight = camera.position.y - token.position.y;
      const camDist = Math.sqrt(
        Math.pow(camera.position.x - token.position.x, 2) +
        Math.pow(camera.position.z - token.position.z, 2)
      );
      const polarAngle = Math.atan2(camDist, camHeight);

      // Máximo de 15 graus de inclinação (0.26 radianos)
      const tiltX = Math.min(0.26, Math.max(0, (Math.PI / 2 - polarAngle) * 0.35));

      token.rotation.set(-tiltX, angleY + userRotY, 0);
    }
  }
}

  return { renderer, scene, camera, controls, updateBillboards };
}