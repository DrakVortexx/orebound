import * as THREE from "three";
import "./style.css";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.getElementById("app").innerHTML = "";
document.getElementById("app").appendChild(renderer.domElement);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x666666, 2);
scene.add(light);

// Ground
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(40, 1, 40),
  new THREE.MeshStandardMaterial({ color: 0x3f7d20 })
);
ground.position.y = -0.5;
scene.add(ground);

// Starter Plot
const plot = new THREE.Mesh(
  new THREE.BoxGeometry(10, 0.2, 10),
  new THREE.MeshStandardMaterial({ color: 0x777777 })
);
plot.position.y = 0.1;
scene.add(plot);

// Placeholder Generator
const generator = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 2, 1.5),
  new THREE.MeshStandardMaterial({ color: 0xffd700 })
);
generator.position.set(0, 1, 0);
scene.add(generator);

function animate() {
  requestAnimationFrame(animate);

  generator.rotation.y += 0.01;

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});