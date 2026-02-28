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

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;

      // Normaliza para 1.8 unidades de altura (tamanho de personagem)
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim;
      model.scale.setScalar(scale);

      // Reposiciona no chão após escala
      const box2 = new THREE.Box3().setFromObject(model);
      const bottom = box2.min.y;
      model.position.set(0, -bottom, 0);

      model.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
      });

      const tokenId = 'token-' + Date.now();
      model.name = tokenId;

      scene.add(model);
      tokenMap.set(tokenId, model);

      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Token carregado:', file.name, '| ID:', tokenId);
    },
    undefined,
    (error) => {
      hideLoading();
      console.error('[Loader] Erro ao carregar token:', error);
      alert('Erro ao carregar o token. Verifique se o arquivo é um .glb válido.');
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