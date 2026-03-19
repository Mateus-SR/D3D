import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { tokenMap } from './token.js';

const loader = new GLTFLoader();
let currentMap = null;

// --- Loading UI ---

function showLoading(label) {
  const el = document.getElementById('loading');
  el.style.display = 'block';
  el.textContent = label || '⏳ Carregando...';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// --- Converte File para base64 ---
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // resultado: "data:application/octet-stream;base64,AAAA..."
      // queremos só a parte após a vírgula
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Detecta se base64 é GLB (magic bytes: 0x676C5446 = "glTF") ---
function isGLB(base64) {
  try {
    const bytes = atob(base64.substring(0, 8));
    return bytes.startsWith('glTF');
  } catch {
    return false;
  }
}

// --- Converte base64 para object URL utilizável pelo loader ---
function base64ToObjectURL(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

// ============================================================
// MAPA
// ============================================================

function _applyMap(scene, gltf) {
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
}

// Carrega mapa a partir de File local (e retorna base64 para emitir)
export async function loadMap(scene, file) {
  showLoading(`⏳ Carregando mapa: ${file.name}`);

  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
  }

  const base64 = await fileToBase64(file);
  const url = base64ToObjectURL(base64, 'model/gltf-binary');

  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      _applyMap(scene, gltf);
      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Mapa carregado:', file.name);
      resolve(base64);
    }, undefined, (err) => {
      hideLoading();
      console.error('[Loader] Erro mapa:', err);
      alert('Erro ao carregar o mapa. Verifique se é um .glb válido.');
      reject(err);
    });
  });
}

// Carrega mapa a partir de base64 recebido da rede
export function loadMapFromBase64(scene, base64, fileName) {
  showLoading(`⏳ Recebendo mapa: ${fileName}`);

  if (currentMap) {
    scene.remove(currentMap);
    currentMap = null;
  }

  const url = base64ToObjectURL(base64, 'model/gltf-binary');

  loader.load(url, (gltf) => {
    _applyMap(scene, gltf);
    hideLoading();
    URL.revokeObjectURL(url);
    console.log('[Loader] Mapa recebido da rede:', fileName);
  }, undefined, (err) => {
    hideLoading();
    console.error('[Loader] Erro mapa da rede:', err);
  });
}

// ============================================================
// TOKEN
// ============================================================

function _createTokenSprite(scene, texture, tokenId) {
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

  sprite.name = tokenId;
  sprite.userData.shadow = shadow;

  scene.add(sprite);
  scene.add(shadow);
  tokenMap.set(tokenId, sprite);

  return sprite;
}

function _createToken3D(scene, gltf, tokenId) {
  const model = gltf.scene;

  // Normaliza altura para 1.8 unidades
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scaleF = 1.8 / size.y;
  model.scale.setScalar(scaleF);

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  model.name = tokenId;
  scene.add(model);
  tokenMap.set(tokenId, model);

  return model;
}

// Carrega token a partir de File local (retorna { base64, tokenId })
export async function loadToken(scene, file) {
  showLoading(`⏳ Carregando token: ${file.name}`);

  const base64 = await fileToBase64(file);
  const tokenId = 'token-' + Date.now();

  if (isGLB(base64)) {
    // Token 3D
    const url = base64ToObjectURL(base64, 'model/gltf-binary');
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        _createToken3D(scene, gltf, tokenId);
        hideLoading();
        URL.revokeObjectURL(url);
        console.log('[Loader] Token 3D carregado:', file.name, '| ID:', tokenId);
        resolve({ base64, tokenId });
      }, undefined, (err) => {
        hideLoading();
        console.error('[Loader] Erro token 3D:', err);
        reject(err);
      });
    });
  } else {
    // Token 2D PNG
    const url = base64ToObjectURL(base64, 'image/png');
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(url, (texture) => {
        _createTokenSprite(scene, texture, tokenId);
        hideLoading();
        URL.revokeObjectURL(url);
        console.log('[Loader] Token 2D carregado:', file.name, '| ID:', tokenId);
        resolve({ base64, tokenId });
      }, undefined, (err) => {
        hideLoading();
        console.error('[Loader] Erro token 2D:', err);
        reject(err);
      });
    });
  }
}

// Carrega token a partir de base64 recebido da rede
export function loadTokenFromBase64(scene, base64, fileName, tokenId, state) {
  showLoading(`⏳ Recebendo token: ${fileName}`);

  if (isGLB(base64)) {
    const url = base64ToObjectURL(base64, 'model/gltf-binary');
    loader.load(url, (gltf) => {
      const token = _createToken3D(scene, gltf, tokenId);
      if (state) _applyTokenState(token, state);
      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Token 3D recebido da rede:', fileName);
    }, undefined, (err) => {
      hideLoading();
      console.error('[Loader] Erro token 3D da rede:', err);
    });
  } else {
    const url = base64ToObjectURL(base64, 'image/png');
    new THREE.TextureLoader().load(url, (texture) => {
      const token = _createTokenSprite(scene, texture, tokenId);
      if (state) _applyTokenState(token, state);
      hideLoading();
      URL.revokeObjectURL(url);
      console.log('[Loader] Token 2D recebido da rede:', fileName);
    }, undefined, (err) => {
      hideLoading();
      console.error('[Loader] Erro token 2D da rede:', err);
    });
  }
}

// Aplica estado de posição/rotação/escala a um token recém-criado
function _applyTokenState(token, state) {
  if (state.x !== undefined) token.position.set(state.x, state.y ?? token.position.y, state.z ?? token.position.z);
  if (state.scale !== undefined) token.scale.setScalar(state.scale);
  if (state.rotY !== undefined) {
    const rad = THREE.MathUtils.degToRad(state.rotY);
    if (token.geometry?.type === 'PlaneGeometry') {
      token.userData.rotationY = rad;
    } else {
      token.rotation.y = rad;
    }
  }
}

// ============================================================
// UTILITÁRIOS (mantidos do original)
// ============================================================

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
    return null;
  }

  const lastKey = importedKeys[importedKeys.length - 1];
  const token = tokenMap.get(lastKey);

  if (token.userData.shadow) {
    scene.remove(token.userData.shadow);
  }

  scene.remove(token);
  tokenMap.delete(lastKey);
  console.log('[Loader] Token removido:', lastKey);
  return lastKey; // retorna o id para poder emitir token:remove
}