import * as THREE from 'three';
import { gameState } from './GameState.js';
import { GAME_CONFIG } from './GameConfig.js';

export class GameEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.objects = new Map();
    this.lights = new Map();
    this.particles = [];
    this.mixers = [];
    this.particlePool = [];
    this.maxParticles = 100;
    this.objectPool = new Map();
  }

  init(container) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Environment
    this.setupEnvironment();

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.isRunning = true;
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambient);
    this.lights.set('ambient', ambient);

    // Hemisphere light for sky/ground
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemi);
    this.lights.set('hemisphere', hemi);

    // Directional light (sun)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(50, 100, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 500;
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
    this.scene.add(dir);
    this.lights.set('sun', dir);

    // Add point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xff6600, 0.5, 50);
    pointLight1.position.set(30, 5, 0);
    this.scene.add(pointLight1);
    this.lights.set('shopLight', pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ff00, 0.3, 30);
    pointLight2.position.set(0, 5, 30);
    this.scene.add(pointLight2);
    this.lights.set('crateLight', pointLight2);
  }

  setupEnvironment() {
    // Ground with grass texture variation
    const groundGeometry = new THREE.BoxGeometry(200, 2, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c4e,
      roughness: 0.9,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.set('ground', ground);

    // Add grass patches
    this.addGrassPatches();

    // Mining area (darker rocky terrain)
    const miningAreaGeometry = new THREE.BoxGeometry(80, 1, 80);
    const miningAreaMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3f35,
      roughness: 0.95,
      metalness: 0.05
    });
    const miningArea = new THREE.Mesh(miningAreaGeometry, miningAreaMaterial);
    miningArea.position.set(-40, 0.5, -40);
    miningArea.receiveShadow = true;
    this.scene.add(miningArea);
    this.objects.set('miningArea', miningArea);

    // Add rocks to mining area
    this.addMiningRocks();

    // Path from mining area to shop
    this.createPath();

    // Sky dome with gradient
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ec8e3,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
    this.objects.set('sky', sky);

    // Add clouds
    this.addClouds();
  }

  addGrassPatches() {
    const grassGeometry = new THREE.ConeGeometry(0.3, 1, 4);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d8a5f,
      roughness: 0.9
    });

    for (let i = 0; i < 200; i++) {
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.set(
        (Math.random() - 0.5) * 180,
        0.5,
        (Math.random() - 0.5) * 180
      );
      grass.rotation.y = Math.random() * Math.PI;
      grass.scale.setScalar(0.5 + Math.random() * 0.5);
      grass.castShadow = true;
      this.scene.add(grass);
    }
  }

  addMiningRocks() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3429,
      roughness: 0.95,
      metalness: 0.1
    });

    for (let i = 0; i < 30; i++) {
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        -40 + (Math.random() - 0.5) * 70,
        1.5,
        -40 + (Math.random() - 0.5) * 70
      );
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.setScalar(0.5 + Math.random() * 1.5);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  createPath() {
    const pathGeometry = new THREE.BoxGeometry(60, 0.1, 4);
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.95
    });
    
    // Path from mining area to center
    const path1 = new THREE.Mesh(pathGeometry, pathMaterial);
    path1.position.set(-10, 0.05, -40);
    path1.rotation.y = Math.PI / 4;
    this.scene.add(path1);

    // Path from center to shop
    const path2 = new THREE.Mesh(pathGeometry, pathMaterial);
    path2.position.set(15, 0.05, 0);
    this.scene.add(path2);
  }

  addClouds() {
    const cloudGeometry = new THREE.SphereGeometry(8, 8, 8);
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 8; i++) {
      const cloudGroup = new THREE.Group();
      
      for (let j = 0; j < 5; j++) {
        const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudPart.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 10
        );
        cloudPart.scale.setScalar(0.5 + Math.random() * 0.5);
        cloudGroup.add(cloudPart);
      }

      cloudGroup.position.set(
        (Math.random() - 0.5) * 300,
        50 + Math.random() * 30,
        (Math.random() - 0.5) * 300
      );
      
      this.scene.add(cloudGroup);
    }
  }

  createPlayerPlot(size) {
    // Remove existing plot
    if (this.objects.has('playerPlot')) {
      this.scene.remove(this.objects.get('playerPlot'));
    }

    // Create plot platform
    const plotGeometry = new THREE.BoxGeometry(size, 0.5, size);
    const plotMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      roughness: 0.7,
      metalness: 0.3
    });
    const plot = new THREE.Mesh(plotGeometry, plotMaterial);
    plot.position.y = 0.25;
    plot.receiveShadow = true;
    plot.castShadow = true;
    this.scene.add(plot);
    this.objects.set('playerPlot', plot);

    // Plot border
    const borderGeometry = new THREE.BoxGeometry(size + 1, 1, size + 1);
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.4
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = 0.5;
    this.scene.add(border);
    this.objects.set('plotBorder', border);

    // Plot sign
    this.createPlotSign(size);
  }

  createPlotSign(size) {
    if (this.objects.has('plotSign')) {
      this.scene.remove(this.objects.get('plotSign'));
    }

    const signGroup = new THREE.Group();

    // Post
    const postGeometry = new THREE.BoxGeometry(0.3, 3, 0.3);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 1.5;
    signGroup.add(post);

    // Sign board
    const boardGeometry = new THREE.BoxGeometry(3, 1.5, 0.2);
    const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.y = 3;
    signGroup.add(board);

    signGroup.position.set(size / 2 + 2, 0, 0);
    this.scene.add(signGroup);
    this.objects.set('plotSign', signGroup);
  }

  createShop() {
    const shopGroup = new THREE.Group();

    // Shop building
    const buildingGeometry = new THREE.BoxGeometry(8, 6, 8);
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.7
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 3;
    building.castShadow = true;
    building.receiveShadow = true;
    shopGroup.add(building);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(7, 3, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 7.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    shopGroup.add(roof);

    // Door
    const doorGeometry = new THREE.BoxGeometry(2, 3.5, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.75, 4.1);
    shopGroup.add(door);

    // Sign
    const signGeometry = new THREE.BoxGeometry(6, 1, 0.3);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.2
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 6.5, 4.2);
    shopGroup.add(sign);

    shopGroup.position.set(30, 0, 0);
    this.scene.add(shopGroup);
    this.objects.set('shop', shopGroup);
  }

  createCrateArea() {
    const crateAreaGroup = new THREE.Group();

    // Platform
    const platformGeometry = new THREE.BoxGeometry(12, 0.5, 12);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f4f4f,
      roughness: 0.8
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.25;
    platform.receiveShadow = true;
    crateAreaGroup.add(platform);

    // Crates display pedestals
    for (let i = 0; i < 4; i++) {
      const pedestalGeometry = new THREE.CylinderGeometry(1, 1.2, 1, 8);
      const pedestalMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969,
        roughness: 0.6
      });
      const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
      pedestal.position.set((i - 1.5) * 3, 1, 0);
      pedestal.castShadow = true;
      crateAreaGroup.add(pedestal);
    }

    crateAreaGroup.position.set(0, 0, 30);
    this.scene.add(crateAreaGroup);
    this.objects.set('crateArea', crateAreaGroup);
  }

  createOre(oreType, position) {
    const geometry = new THREE.DodecahedronGeometry(oreType.size, 1);
    const material = new THREE.MeshStandardMaterial({
      color: oreType.color,
      roughness: 0.6,
      metalness: 0.4,
      emissive: oreType.color,
      emissiveIntensity: 0.1
    });
    const ore = new THREE.Mesh(geometry, material);
    ore.position.copy(position);
    ore.castShadow = true;
    ore.receiveShadow = true;
    ore.userData = { type: 'ore', oreType: oreType, health: oreType.miningDifficulty };
    
    // Add subtle floating animation
    ore.userData.baseY = position.y;
    ore.userData.floatOffset = Math.random() * Math.PI * 2;
    
    this.scene.add(ore);
    return ore;
  }

  createGenerator(generatorType, position) {
    const generatorGroup = new THREE.Group();

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(
      generatorType.size.width * 0.6,
      generatorType.size.width * 0.8,
      0.3,
      8
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.5
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    generatorGroup.add(base);

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(
      generatorType.size.width,
      generatorType.size.height,
      generatorType.size.depth
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: generatorType.color,
      roughness: 0.4,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = generatorType.size.height / 2 + 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    generatorGroup.add(body);

    // Glowing core
    const coreGeometry = new THREE.SphereGeometry(
      generatorType.size.width * 0.3,
      16,
      16
    );
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: generatorType.color,
      emissive: generatorType.color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = generatorType.size.height / 2 + 0.3;
    generatorGroup.add(core);

    // Energy rings
    const ringGeometry = new THREE.TorusGeometry(
      generatorType.size.width * 0.5,
      0.1,
      8,
      32
    );
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: generatorType.color,
      emissive: generatorType.color,
      emissiveIntensity: 0.5
    });
    
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.position.y = generatorType.size.height * 0.7 + 0.3;
    ring1.rotation.x = Math.PI / 2;
    generatorGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring2.position.y = generatorType.size.height * 0.7 + 0.3;
    ring2.rotation.y = Math.PI / 2;
    generatorGroup.add(ring2);

    generatorGroup.position.copy(position);
    generatorGroup.userData = { 
      type: 'generator', 
      generatorType: generatorType,
      rings: [ring1, ring2]
    };
    
    this.scene.add(generatorGroup);
    return generatorGroup;
  }

  createParticle(position, color, count = 10) {
    // Limit total particles for performance
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particles
      const oldest = this.particles.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: Math.random() * 0.3,
        z: (Math.random() - 0.5) * 0.2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.2,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities, life: 1 };
    this.scene.add(particles);
    this.particles.push(particles);
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particles = this.particles[i];
      const positions = particles.geometry.attributes.position.array;
      const velocities = particles.userData.velocities;

      particles.userData.life -= delta * 2;
      particles.material.opacity = particles.userData.life;

      for (let j = 0; j < velocities.length; j++) {
        positions[j * 3] += velocities[j].x;
        positions[j * 3 + 1] += velocities[j].y;
        positions[j * 3 + 2] += velocities[j].z;

        velocities[j].y -= delta * 0.5; // gravity
      }

      particles.geometry.attributes.position.needsUpdate = true;

      if (particles.userData.life <= 0) {
        this.scene.remove(particles);
        this.particles.splice(i, 1);
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateParticles(delta);
    this.updateOreAnimations(time, delta);
    this.updateGeneratorAnimations(time);

    this.renderer.render(this.scene, this.camera);
  }

  updateOreAnimations(time, delta) {
    this.scene.traverse((object) => {
      if (object.userData && object.userData.type === 'ore') {
        // Floating animation
        object.position.y = object.userData.baseY + Math.sin(time * 2 + object.userData.floatOffset) * 0.1;
        
        // Subtle rotation
        object.rotation.y += delta * 0.5;
        object.rotation.x = Math.sin(time + object.userData.floatOffset) * 0.1;
      }
    });
  }

  updateGeneratorAnimations(time) {
    this.scene.traverse((object) => {
      if (object.userData && object.userData.type === 'generator') {
        // Pulsing glow effect
        const glowIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        object.children.forEach(child => {
          if (child.material && child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = glowIntensity;
          }
        });

        // Rotating rings
        if (object.userData.rings) {
          object.userData.rings[0].rotation.z += 0.02;
          object.userData.rings[1].rotation.x += 0.02;
        }
      }
    });
  }

  stop() {
    this.isRunning = false;
  }

  cleanup() {
    this.stop();
    
    // Remove all objects and dispose geometries/materials
    this.objects.forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.objects.clear();

    // Remove particles and dispose
    this.particles.forEach((p) => {
      this.scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    });
    this.particles = [];

    // Clear lights
    this.lights.clear();

    // Clean up renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}

export const gameEngine = new GameEngine();
