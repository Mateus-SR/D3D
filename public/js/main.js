import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const radius = 1.75;  
const geometry = new THREE.IcosahedronGeometry( radius );
const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,       // Cor verde
    roughness: 0.5,        // 0.0 é espelho, 1.0 é totalmente fosco
    metalness: 1.0,        // 0.0 é plástico, 1.0 é metálico
    flatShading: false,      // ESSENCIAL: Deixa as faces "duras" (facetadas)
    emissive: 0x0000FF,     // Um verde mais escuro para o brilho interno
    emissiveIntensity: 0.25
});

const d20 = new THREE.Mesh( geometry, material );
scene.add( d20 );

camera.position.z = 7;

const dirLight = new THREE.DirectionalLight(0xffffff, 5);
dirLight.position.set(0, 0, 0);
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0x000000); // Luz cinza suave
scene.add(ambientLight);

function animate() {
    
    d20.rotation.y += 0.015;
    d20.rotation.z += 0.007;
    const time = Date.now() * 0.001; // Multiplica por 0.001 para converter ms em segundos
    
    // A luz vai subir e descer (eixo Y) suavemente
    dirLight.position.y = Math.sin(time) * 20; 
    
    // A luz vai para frente e para trás (eixo Z) suavemente
    dirLight.position.z = Math.cos(time) * 20;

    camera.position.z = 7 + (Math.sin(time) * 2.1);
    renderer.render( scene, camera );
  }
  renderer.setAnimationLoop( animate );