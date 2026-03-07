import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tokenMap } from './token.js';

const loader = new GLTFLoader();
let currentMap = null;

function showLoading() {
  document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

export function loadMap(scene, file) {
  const url = URL.createObjectURL(file);
  showLoading();

  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
  }

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y = 0;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      model.name = 'imported-map';
      scene.add(model);
      currentMap = model;

      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Mapa carregado:', file.name);
    },
    undefined,
    (error) => {
      hideLoading();
      console.error('[Loader] Erro ao carregar mapa:', error);
      alert('Erro ao carregar o mapa. Verifique se o arquivo é um .glb válido.');
    }
  );
}

export function loadToken(scene, file) {
  const url = URL.createObjectURL(file);
  showLoading();

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    url,
    (texture) => {
      const aspect = texture.image.width / texture.image.height;
      const height = 1.8;
      const width = height * aspect;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        toneMapped: false
      });

      const sprite = new THREE.Mesh(geometry, material);
      sprite.position.set(0, height / 2, 0);

      // Sombra corrigida — na cena diretamente, não filha do sprite
      const shadowGeo = new THREE.CircleGeometry(width * 0.25, 32);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.02, 0);
      shadow.renderOrder = 1;

      const tokenId = 'token-' + Date.now();
      sprite.name = tokenId;
      sprite.userData.shadow = shadow;

      scene.add(sprite);
      scene.add(shadow); // sombra independente na cena
      tokenMap.set(tokenId, sprite);

      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Token 2D carregado:', file.name, '| ID:', tokenId);
    },
    undefined,
    (error) => {
      hideLoading();
      console.error('[Loader] Erro ao carregar token 2D:', error);
      alert('Erro ao carregar a imagem. Verifique se é um PNG válido.');
    }
  );
}

export function clearMap(scene) {
  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
    console.log('[Loader] Mapa removido.');
  }
}

export function removeLastToken(scene) {
  const keys = Array.from(tokenMap.keys());
  const importedKeys = keys.filter(k => k.startsWith('token-'));

  if (importedKeys.length === 0) {
    console.log('[Loader] Nenhum token importado para remover.');
    return;
  }

  const lastKey = importedKeys[importedKeys.length - 1];
  const token = tokenMap.get(lastKey);

  // Remove sombra junto com o token
  if (token.userData.shadow) {
    scene.remove(token.userData.shadow);
  }

  scene.remove(token);
  tokenMap.delete(lastKey);
  console.log('[Loader] Token removido:', lastKey);
}