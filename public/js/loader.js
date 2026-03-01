import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tokenMap } from './token.js';

const loader = new GLTFLoader();
let currentMap = null; // referência ao mapa atual na cena

function showLoading() {
  document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

/**
 * Carrega um arquivo .glb como MAPA (cenário).
 * Remove o mapa anterior se existir.
 */
export function loadMap(scene, file) {
  const url = URL.createObjectURL(file);
  showLoading();

  // Remove mapa anterior
  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
  }

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;

      // Centraliza o modelo automaticamente
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y = 0;

      // Ativa sombras em todos os meshes do modelo
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
      URL.revokeObjectURL(url); // libera memória
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

/**
 * Carrega um arquivo .glb como TOKEN (peça arrastável).
 * Gera um ID único e adiciona ao tokenMap.
 */
export function loadToken(scene, file) {
  const url = URL.createObjectURL(file);
  showLoading();

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    url,
    (texture) => {
      // Mantém proporção da imagem original
      const aspect = texture.image.width / texture.image.height;
      const height = 1.8;
      const width = height * aspect;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,  // respeita o fundo transparente do PNG
        alphaTest: 0.1,     // descarta pixels quase transparentes
        side: THREE.DoubleSide
      });

      const sprite = new THREE.Mesh(geometry, material);

      // Posiciona no centro da cena em pé no chão
      sprite.position.set(0, height / 2, 0);

      const tokenId = 'token-' + Date.now();
      sprite.name = tokenId;

      scene.add(sprite);
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

/**
 * Remove o mapa atual da cena.
 */
export function clearMap(scene) {
  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
    console.log('[Loader] Mapa removido.');
  }
}

export function removeLastToken(scene) {
  const keys = Array.from(tokenMap.keys());

  // Pega apenas tokens importados (.glb), não os cubos de player
  const importedKeys = keys.filter(k => k.startsWith('token-'));

  if (importedKeys.length === 0) {
    console.log('[Loader] Nenhum token importado para remover.');
    return;
  }

  const lastKey = importedKeys[importedKeys.length - 1];
  const token = tokenMap.get(lastKey);
  scene.remove(token);
  tokenMap.delete(lastKey);
  console.log('[Loader] Token removido:', lastKey);
}