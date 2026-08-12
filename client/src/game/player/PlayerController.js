import * as THREE from 'three';
import { gameState } from '../GameState.js';

export class PlayerController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    
    this.moveSpeed = 10;
    this.jumpForce = 8;
    this.gravity = 20;
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = false;
    
    this.isGrounded = true;
    this.playerHeight = 2;
    
    this.raycaster = new THREE.Raycaster();
    this.interactionDistance = 5;
    
    this.currentTarget = null;
    this.isInteracting = false;
    this.interactionStartTime = 0;
    this.interactionDuration = 1000;
    
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
    document.addEventListener('mousedown', (event) => this.onMouseDown(event));
    document.addEventListener('mouseup', (event) => this.onMouseUp(event));
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        if (this.canJump) {
          this.velocity.y = this.jumpForce;
          this.canJump = false;
          this.isGrounded = false;
        }
        break;
      case 'KeyE':
        this.startInteraction();
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'KeyE':
        this.cancelInteraction();
        break;
    }
  }

  onMouseDown(event) {
    if (event.button === 0) { // Left click
      this.tryMine();
    }
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.stopMining();
    }
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
    // Apply movement
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    // Get camera direction (horizontal only)
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

    // Calculate movement direction
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(cameraDirection, this.direction.z);
    moveDirection.addScaledVector(cameraRight, this.direction.x);
    moveDirection.normalize();

    // Apply movement
    if (this.direction.z !== 0 || this.direction.x !== 0) {
      this.velocity.x = moveDirection.x * this.moveSpeed;
      this.velocity.z = moveDirection.z * this.moveSpeed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // Update position
    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.y += this.velocity.y * delta;
    this.camera.position.z += this.velocity.z * delta;

    // Ground collision
    if (this.camera.position.y < this.playerHeight) {
      this.camera.position.y = this.playerHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.canJump = true;
    }

    // Update game state position
    gameState.playerPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
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

  checkForInteractions() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = this.interactionDistance;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData && (hit.object.userData.type === 'ore' || 
                                   hit.object.userData.type === 'generator' ||
                                   hit.object.userData.type === 'crate')) {
        this.currentTarget = hit.object;
        return;
      }
    }

    this.currentTarget = null;
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
    
    // Add to inventory
    gameState.addToInventory(oreType.id, 1);

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

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities, life: 1 };
    this.scene.add(particles);

    // Animate particles
    const animateParticles = () => {
      const positions = particles.geometry.attributes.position.array;
      let alive = false;

      for (let i = 0; i < velocities.length; i++) {
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

        velocities[i].y -= 0.01;

        if (positions[i * 3 + 1] > 0) alive = true;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.userData.life -= 0.02;
      particles.material.opacity = particles.userData.life;

      if (particles.userData.life > 0) {
        requestAnimationFrame(animateParticles);
      } else {
        this.scene.remove(particles);
      }
    };

    animateParticles();
  }

  setPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  getPosition() {
    return this.camera.position.clone();
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
