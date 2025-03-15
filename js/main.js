import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.setClearColor(0x87CEEB);
document.body.appendChild(renderer.domElement);

// LIGHTS
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// GROUND
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// GRID & AXIS HELPER (DEBUG)
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// ORBITCONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// IMPORT CAR MODEL
let model;

const modelLoader = new GLTFLoader();
modelLoader.load(
    "../assets/kenney_car-kit/Models/GLB format/hatchback-sports.glb",
    (gltf) => {
        model = gltf.scene;
        model.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        scene.add(model);

        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);

        const center = box.getCenter(new THREE.Vector3());
        camera.position.set(center.x + 5, center.y + 3, center.z + 5);
        camera.lookAt(center);
        controls.target.copy(center);
    },
    (progress) => {
        console.log('Loading progress: ', (progress.loaded / progress.total) * 100, '%');
    },
    (error) => {
        console.error('Error loading GLB:', error);
    }
);

camera.position.set(3, 2, 5);

function animate() {
    controls.update();
    renderer.render(scene, camera);
}

// LISTENERS
window.addEventListener("resize",()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})