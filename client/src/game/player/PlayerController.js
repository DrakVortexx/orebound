import * as THREE from 'three';
import { gameState } from '../GameState.js';

export class PlayerController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    
    // Player state - based on example game
    this.pos = new THREE.Vector3(0, 1.65, 11);
    this.yaw = 0;
    this.pitch = -0.15;
    this.speed = 8.2;
    this.radius = 0.45;
    this.velY = 0;
    this.onGround = true;
    this.pointerLocked = false;
    
    // Movement state
    this.keys = new Set();
    this.mobileInput = { enabled: false, moveX: 0, moveY: 0 };
    
    // Physics constants - from example game
    this.groundY = 1.65;
    this.gravity = 17.5;
    this.jumpVelocity = 7.8;
    
    // Interaction system
    this.raycaster = new THREE.Raycaster();
    this.interactionDistance = 5;
    this.currentTarget = null;
    this.isInteracting = false;
    this.interactionStartTime = 0;
    this.interactionDuration = 1000;
    
    // Camera mode
    this.cameraMode = 'first'; // 'first' or 'third-back'
    
    // Stun state
    this.stunUntil = 0;
    
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
    document.addEventListener('mousedown', (event) => this.onMouseDown(event));
    document.addEventListener('mouseup', (event) => this.onMouseUp(event));
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    
    // Camera controls
    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
  }

  onKeyDown(event) {
    this.keys.add(event.code);
    
    if (event.code === 'Space' && this.onGround) {
      this.velY = this.jumpVelocity;
      this.onGround = false;
    }
    
    if (event.code === 'KeyE') {
      this.startInteraction();
    }
    
    if (event.code === 'KeyF') {
      this.openLuckyBlock();
    }
    
    // Toggle camera mode with V
    if (event.code === 'KeyV') {
      this.cameraMode = this.cameraMode === 'first' ? 'third-back' : 'first';
    }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
    
    if (event.code === 'KeyE') {
      this.cancelInteraction();
    }
  }

  onMouseDown(event) {
    if (event.button === 0) { // Left click
      if (!this.pointerLocked) {
        this.camera.element?.requestPointerLock();
      } else {
        this.tryMine();
      }
    }
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.stopMining();
    }
  }

  onMouseMove(event) {
    if (!this.pointerLocked) return;
    
    const sensitivity = 0.002;
    this.yaw -= event.movementX * sensitivity;
    this.pitch -= event.movementY * sensitivity;
    
    // Clamp pitch
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
  }

  onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.camera.element;
  }

  startInteraction() {
    if (this.currentTarget && !this.isInteracting) {
      this.isInteracting = true;
      this.interactionStartTime = Date.now();
      this.onInteractionStart(this.currentTarget);
    }
  }

  cancelInteraction() {
    if (this.isInteracting) {
      this.isInteracting = false;
      this.onInteractionCancel(this.currentTarget);
    }
  }

  tryMine() {
    if (this.currentTarget && this.currentTarget.userData.type === 'ore') {
      this.isMining = true;
      this.mineTarget = this.currentTarget;
    }
  }

  stopMining() {
    this.isMining = false;
    this.mineTarget = null;
  }

  onInteractionStart(target) {
    // Override in game implementation
    console.log('Interaction started with:', target.userData.type);
  }

  onInteractionCancel(target) {
    // Override in game implementation
    console.log('Interaction cancelled');
  }

  onInteractionComplete(target) {
    // Override in game implementation
    console.log('Interaction completed with:', target.userData.type);
  }

  update(delta) {
    // Check if stunned
    const now = performance.now() / 1000;
    if (this.stunUntil > now) return;
    
    // Movement - based on example game's movePlayer function
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const m = new THREE.Vector3();

    if (this.keys.has("KeyW")) m.sub(fwd);
    if (this.keys.has("KeyS")) m.add(fwd);
    if (this.keys.has("ArrowUp")) m.sub(fwd);
    if (this.keys.has("ArrowDown")) m.add(fwd);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) m.sub(right);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) m.add(right);
    
    // Mobile input
    if (this.mobileInput.enabled) {
      m.addScaledVector(right, this.mobileInput.moveX);
      m.addScaledVector(fwd, this.mobileInput.moveY);
    }

    // Apply movement
    if (m.lengthSq() > 0) {
      m.normalize().multiplyScalar(this.speed * delta);
      this.pos.add(m);
    }

    // Bound player position
    this.pos.x = Math.max(-160, Math.min(160, this.pos.x));
    this.pos.z = Math.max(-60, Math.min(60, this.pos.z));

    // Jumping and gravity - from example game
    if (this.keys.has("Space") && this.onGround) {
      this.velY = this.jumpVelocity;
      this.onGround = false;
    }
    this.velY -= this.gravity * delta;
    this.velY *= 0.992;
    this.pos.y += this.velY * delta;
    if (this.pos.y <= this.groundY) {
      this.pos.y = this.groundY;
      this.velY = 0;
      this.onGround = true;
    }

    // Update camera
    this.updateCamera();

    // Update game state position
    gameState.playerPosition = {
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z
    };

    // Check for interactions
    this.checkForInteractions();

    // Handle ongoing interaction
    if (this.isInteracting && this.currentTarget) {
      const elapsed = Date.now() - this.interactionStartTime;
      if (elapsed >= this.interactionDuration) {
        this.onInteractionComplete(this.currentTarget);
        this.isInteracting = false;
        this.currentTarget = null;
      }
    }

    // Handle mining
    if (this.isMining && this.mineTarget) {
      this.handleMining(delta);
    }
  }

  updateCamera() {
    // Based on example game's updateCamera function
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    
    if (this.cameraMode === "third-back") {
      const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(5.2);
      const height = 2.2;
      const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.1, this.pos.z);
      const camPos = new THREE.Vector3(
        target.x + back.x,
        target.y + height,
        target.z + back.z
      );
      this.camera.position.copy(camPos);
    } else {
      this.camera.position.copy(this.pos);
    }
  }

  checkForInteractions() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = this.interactionDistance;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData && (hit.object.userData.type === 'ore' || 
                                   hit.object.userData.type === 'luckyBlock' ||
                                   hit.object.userData.type === 'plot' ||
                                   hit.object.userData.type === 'pedestal')) {
        this.currentTarget = hit.object;
        return;
      }
    }

    this.currentTarget = null;
  }

  openLuckyBlock() {
    if (this.currentTarget && this.currentTarget.userData.type === 'pedestal') {
      const pedestal = this.currentTarget;
      if (pedestal.userData.hasBlock && !pedestal.userData.creatureId) {
        this.startLuckyBlockOpen(pedestal);
      }
    }
  }

  startLuckyBlockOpen(pedestal) {
    // This will be handled by the game's Lucky Block system
    pedestal.userData.openingUntil = performance.now() / 1000 + 3; // 3 second opening
    this.onInteractionStart(pedestal);
  }

  handleMining(delta) {
    if (!this.mineTarget || !this.mineTarget.userData) return;

    const ore = this.mineTarget;
    const oreType = ore.userData.oreType;

    if (!oreType) return;

    // Reduce ore health
    ore.userData.health -= delta * 2; // Mining speed

    // Visual feedback
    ore.scale.setScalar(1 + Math.sin(Date.now() * 0.02) * 0.1);

    // Check if ore is destroyed
    if (ore.userData.health <= 0) {
      this.destroyOre(ore);
      this.isMining = false;
      this.mineTarget = null;
    }
  }

  destroyOre(ore) {
    const oreType = ore.userData.oreType;
    
    // Add to inventory - will be updated for OREBOUND resources
    gameState.addToInventory(oreType.name, 1);

    // Create particles
    this.createMiningParticles(ore.position, oreType.color);

    // Remove from scene
    this.scene.remove(ore);

    // Trigger callback
    if (this.onOreMined) {
      this.onOreMined(oreType);
    }
  }

  createMiningParticles(position, color) {
    const particleCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: Math.random() * 0.4,
        z: (Math.random() - 0.5) * 0.3
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities, life: 1 };
    this.scene.add(particles);

    // Animate particles
    const animateParticles = () => {
      const positions = particles.geometry.attributes.position.array;
      let alive = false;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;
        velocities[i].y -= 0.01; // gravity

        if (positions[i * 3 + 1] > 0) alive = true;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.userData.life -= 0.02;
      particles.material.opacity = particles.userData.life;

      if (particles.userData.life > 0 && alive) {
        requestAnimationFrame(animateParticles);
      } else {
        this.scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
      }
    };

    animateParticles();
  }

  setPosition(x, y, z) {
    this.pos.set(x, y, z);
  }

  getPosition() {
    return this.pos.clone();
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
