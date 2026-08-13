import * as THREE from 'three';
import { gameState } from './GameState.js';
import { GAME_CONFIG } from './GameConfig.js';
import { ORE_TYPES, MINING_AREAS, getRankByKey } from './OreboundConfig.js';

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
    this.colliders = [];
    this.interactables = [];
    this.plots = [];
    this.creatures = [];
    this.pedestals = [];
    this.remoteAvatarMeshes = [];
    this.localAvatarMesh = null;
  }

  init(container) {
    // Scene - based on example game's setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbde8ff);
    this.scene.fog = new THREE.Fog(0xbde8ff, 24, 300);

    // Camera - based on example game's setup
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 450);
    this.camera.position.set(0, 1.65, 11);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Lighting - based on example game's setup
    this.setupLighting();

    // Environment - based on example game's setup
    this.setupEnvironment();

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.isRunning = true;
    this.animate();
  }

  setupLighting() {
    // Hemisphere light - from example game
    const hemi = new THREE.HemisphereLight(0xdff8ff, 0x3c523a, 1.05);
    this.scene.add(hemi);
    this.lights.set('hemisphere', hemi);

    // Directional light (sun) - from example game
    const sun = new THREE.DirectionalLight(0xfff2d9, 1.5);
    sun.position.set(30, 24, 13);
    sun.castShadow = true;
    sun.shadow.mapSize.set(3072, 3072);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.camera.far = 150;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 2.1;
    this.scene.add(sun);
    this.lights.set('sun', sun);

    // Fill light - from example game
    const fill = new THREE.DirectionalLight(0xa8d7ff, 0.45);
    fill.position.set(-24, 15, -10);
    this.scene.add(fill);
    this.lights.set('fill', fill);

    // Rim light - from example game
    const rim = new THREE.DirectionalLight(0xffcf9c, 0.28);
    rim.position.set(14, 11, -28);
    this.scene.add(rim);
    this.lights.set('rim', rim);
  }

  setupEnvironment() {
    // Ground - based on example game's setup
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

    // Add grass patches - from example game
    this.addGrassPatches();

    // Create mining areas - OREBOUND specific
    this.createMiningAreas();

    // Create player base area - from example game's farm concept
    this.createPlayerBase();

    // Sky dome - from example game
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ec8e3,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
    this.objects.set('sky', sky);

    // Add clouds - from example game
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

  createMiningAreas() {
    // Create mining areas based on MINING_AREAS config
    MINING_AREAS.forEach((area, index) => {
      const miningAreaGeometry = new THREE.BoxGeometry(60, 1, 60);
      const miningAreaMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3f35,
        roughness: 0.95,
        metalness: 0.05
      });
      const miningArea = new THREE.Mesh(miningAreaGeometry, miningAreaMaterial);
      miningArea.position.set(area.position.x, 0.5, area.position.z);
      miningArea.receiveShadow = true;
      miningArea.userData = { type: 'miningArea', areaKey: area.key, minTier: area.minTier };
      this.scene.add(miningArea);
      this.objects.set(`miningArea_${area.key}`, miningArea);
      this.colliders.push(miningArea);

      // Add rocks to mining area
      this.addMiningRocks(area.position.x, area.position.z, 30);
    });
  }

  createPlayerBase() {
    // Create player base pad - based on example game's farm
    const padGeometry = new THREE.BoxGeometry(18, 0.36, 11.8);
    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a653f,
      roughness: 0.7,
      metalness: 0.1
    });
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.position.set(8, 0.18, -4.2);
    pad.receiveShadow = true;
    pad.castShadow = true;
    pad.userData = { type: 'playerBase', label: 'Your Base' };
    this.scene.add(pad);
    this.objects.set('playerBase', pad);
    this.colliders.push(pad);

    // Create farm plots for growing Lucky Blocks
    this.createFarmPlots();

    // Create pedestals for placing Lucky Blocks
    this.createPedestals();
  }

  createFarmPlots() {
    // Create 8 plots in 2x4 grid - from example game
    for (let z = 0; z < 2; z += 1) {
      for (let x = 0; x < 4; x += 1) {
        this.createPlot(3.2 + x * 3.2, -7 + z * 3.4);
      }
    }
  }

  createPlot(x, z) {
    const plotGeometry = new THREE.BoxGeometry(2.8, 0.2, 2.8);
    const plotMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.9
    });
    const plot = new THREE.Mesh(plotGeometry, plotMaterial);
    plot.position.set(x, 0.1, z);
    plot.receiveShadow = true;
    plot.userData = {
      type: 'plot',
      stage: 0, // 0 = empty, 1 = growing, 2 = ready
      plantedAt: 0,
      growDuration: 0,
      seedRank: null
    };
    this.scene.add(plot);
    this.plots.push(plot);
    this.objects.set(`plot_${this.plots.length}`, plot);
  }

  createPedestals() {
    // Create pedestals for Lucky Blocks - from example game
    const pedestalPositions = [
      { x: 12, z: 0 },
      { x: 16, z: 0 },
      { x: 12, z: -4 },
      { x: 16, z: -4 }
    ];

    pedestalPositions.forEach((pos, index) => {
      const pedestalGeometry = new THREE.CylinderGeometry(0.8, 1, 1.2, 8);
      const pedestalMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.6,
        metalness: 0.4
      });
      const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
      pedestal.position.set(pos.x, 0.6, pos.z);
      pedestal.receiveShadow = true;
      pedestal.castShadow = true;
      pedestal.userData = {
        type: 'pedestal',
        index: index,
        creatureId: null,
        hasBlock: false,
        blockRankKey: null,
        blockMutation: 'normal',
        blockTrait: 'none',
        openingUntil: 0
      };
      this.scene.add(pedestal);
      this.pedestals.push(pedestal);
      this.objects.set(`pedestal_${index}`, pedestal);
    });
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
        centerX + (Math.random() - 0.5) * 50,
        1.5,
        centerZ + (Math.random() - 0.5) * 50
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

  createOre(oreType, position) {
    const oreGeometry = new THREE.DodecahedronGeometry(1, 0);
    const oreMaterial = new THREE.MeshStandardMaterial({
      color: oreType.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: oreType.color,
      emissiveIntensity: 0.1
    });
    
    const ore = new THREE.Mesh(oreGeometry, oreMaterial);
    ore.position.set(position.x, position.y, position.z);
    ore.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    ore.scale.setScalar(0.8 + Math.random() * 0.4);
    ore.castShadow = true;
    ore.receiveShadow = true;
    ore.userData = {
      type: 'ore',
      oreType: oreType,
      uuid: Math.random().toString(36).substr(2, 9)
    };
    
    this.scene.add(ore);
    return ore;
  }

  createLuckyBlock(rankKey, position, mutation = 'normal', trait = 'none') {
    const rank = getRankByKey(rankKey);
    
    const blockGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: this.getRankColor(rank.key),
      roughness: 0.4,
      metalness: 0.6,
      emissive: this.getRankColor(rank.key),
      emissiveIntensity: 0.3
    });
    
    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(position.x, position.y, position.z);
    block.castShadow = true;
    block.receiveShadow = true;
    block.userData = {
      type: 'luckyBlock',
      rankKey: rank.key,
      mutation: mutation,
      trait: trait,
      uuid: Math.random().toString(36).substr(2, 9)
    };
    
    this.scene.add(block);
    return block;
  }

  getRankColor(rankKey) {
    const colors = {
      basic: 0x808080,
      common: 0x228b22,
      uncommon: 0x006400,
      rare: 0x0000ff,
      epic: 0x800080,
      legendary: 0xffa500,
      mythic: 0xff00ff,
      godly: 0xff0000,
      secret: 0x00ffff,
      transcendent: 0xffffff,
      omniversal: 0xffd700
    };
    return colors[rankKey] || 0x808080;
  }

  registerInteractable(interactable) {
    this.interactables.push(interactable);
  }

  registerCollider(collider) {
    this.colliders.push(collider);
  }

  createShop() {
    const shopGroup = new THREE.Group();

    // Shop building - based on example game's shack
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

  // Old methods removed - replaced with OREBOUND-specific implementations

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

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

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
    this.updateLuckyBlockAnimations(time);
    this.updatePlotGrowth(time);

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

  updateLuckyBlockAnimations(time) {
    this.scene.traverse((object) => {
      if (object.userData && object.userData.type === 'luckyBlock') {
        // Pulsing glow effect based on rarity
        const glowIntensity = 0.3 + Math.sin(time * 2) * 0.2;
        if (object.material && object.material.emissiveIntensity !== undefined) {
          object.material.emissiveIntensity = glowIntensity;
        }

        // Subtle rotation
        object.rotation.y += delta * 0.3;
        object.rotation.x = Math.sin(time * 1.5) * 0.05;
      }
    });
  }

  updatePlotGrowth(time) {
    const now = performance.now() / 1000;
    
    this.plots.forEach(plot => {
      if (plot.userData.stage === 1) { // Growing
        const elapsed = now - plot.userData.plantedAt;
        const progress = Math.min(elapsed / plot.userData.growDuration, 1);
        
        // Update visual growth
        if (plot.userData.growthMesh) {
          const scale = 0.2 + progress * 0.8;
          plot.userData.growthMesh.scale.setScalar(scale);
        }
        
        // Check if ready to harvest
        if (progress >= 1) {
          plot.userData.stage = 2; // Ready
          this.createReadyLuckyBlock(plot);
        }
      }
    });
  }

  createReadyLuckyBlock(plot) {
    // Remove growth mesh if exists
    if (plot.userData.growthMesh) {
      this.scene.remove(plot.userData.growthMesh);
      plot.userData.growthMesh = null;
    }
    
    // Create mature Lucky Block
    const block = this.createLuckyBlock(
      plot.userData.seedRank.key,
      { x: plot.position.x, y: 1, z: plot.position.z },
      plot.userData.mutation,
      plot.userData.trait
    );
    plot.userData.readyBlock = block;
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
