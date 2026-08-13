import * as THREE from 'three';
import { getRankByKey, CREATURE_ARCHETYPES } from '../OreboundConfig.js';
import { gameState } from '../GameState.js';

export class CreatureSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.creatures = new Map();
    this.creatureCollection = new Map();
  }

  generateCreature(rankKey) {
    const rank = getRankByKey(rankKey);
    const archetype = this.getRandomArchetype();
    const name = this.generateCreatureName(archetype, rank);
    
    const creature = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      archetype: archetype,
      rankKey: rank.key,
      rarity: rank.label,
      incomePerSec: this.calculateIncome(rank),
      createdAt: Date.now(),
      position: new THREE.Vector3(0, 0, 0),
      targetPosition: new THREE.Vector3(0, 0, 0),
      speed: 0.5 + Math.random() * 0.5,
      mesh: null
    };
    
    return creature;
  }

  getRandomArchetype() {
    return CREATURE_ARCHETYPES[Math.floor(Math.random() * CREATURE_ARCHETYPES.length)];
  }

  generateCreatureName(archetype, rank) {
    const prefixes = ['Mystic', 'Shadow', 'Golden', 'Crystal', 'Cosmic', 'Ancient', 'Spectral', 'Void'];
    const suffixes = {
      feline: ['Whisker', 'Paw', 'Claw', 'Meow', 'Purr', 'Tail'],
      canid: ['Fang', 'Howl', 'Bark', 'Snout', 'Paw', 'Pack'],
      bird: ['Wing', 'Beak', 'Talon', 'Feather', 'Sky', 'Song'],
      dragon: ['Scale', 'Flame', 'Rune', 'Claw', 'Wing', 'Breath'],
      whale: ['Fin', 'Song', 'Deep', 'Ocean', 'Wave', 'Blue'],
      turtle: ['Shell', 'Ancient', 'Wise', 'Guard', 'Slow', 'Shield'],
      ball: ['Bounce', 'Roll', 'Sphere', 'Orb', 'Round', 'Spin']
    };
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffixList = suffixes[archetype] || suffixes.feline;
    const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];
    
    return `${prefix} ${suffix}`;
  }

  calculateIncome(rank) {
    // Income based on rank multiplier
    const baseIncome = 1;
    const rankMultiplier = rank.min / 10; // Scale based on rank minimum
    return Math.floor(baseIncome * rankMultiplier);
  }

  createCreatureMesh(creature) {
    const rank = getRankByKey(creature.rankKey);
    const color = this.getRankColor(creature.rankKey);
    
    const group = new THREE.Group();
    
    // Create creature based on archetype (simplified versions from example)
    switch (creature.archetype) {
      case 'feline':
        this.createFelineCreature(group, color);
        break;
      case 'canid':
        this.createCanidCreature(group, color);
        break;
      case 'bird':
        this.createBirdCreature(group, color);
        break;
      case 'dragon':
        this.createDragonCreature(group, color);
        break;
      case 'whale':
        this.createWhaleCreature(group, color);
        break;
      case 'turtle':
        this.createTurtleCreature(group, color);
        break;
      case 'ball':
        this.createBallCreature(group, color);
        break;
      default:
        this.createBallCreature(group, color);
    }
    
    group.position.copy(creature.position);
    group.castShadow = true;
    group.receiveShadow = true;
    
    this.gameEngine.scene.add(group);
    creature.mesh = group;
    
    return group;
  }

  createFelineCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.7), 
      roughness: 0.6, 
      metalness: 0.1 
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), bodyMat);
    head.position.set(0, 0.45, 0.45);
    head.castShadow = true;
    group.add(head);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.08, 0.15, 4);
    const leftEar = new THREE.Mesh(earGeometry, detailMat);
    leftEar.position.set(-0.12, 0.65, 0.45);
    leftEar.castShadow = true;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, detailMat);
    rightEar.position.set(0.12, 0.65, 0.45);
    rightEar.castShadow = true;
    group.add(rightEar);
    
    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 6), detailMat);
    tail.position.set(0, 0.25, -0.45);
    tail.rotation.x = Math.PI / 4;
    tail.castShadow = true;
    group.add(tail);
  }

  createCanidCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.7), 
      roughness: 0.6, 
      metalness: 0.1 
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.85), bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), bodyMat);
    head.position.set(0, 0.5, 0.5);
    head.castShadow = true;
    group.add(head);
    
    // Snout
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 6), detailMat);
    snout.position.set(0, 0.45, 0.75);
    snout.rotation.x = Math.PI / 2;
    snout.castShadow = true;
    group.add(snout);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.07, 0.18, 6);
    const leftEar = new THREE.Mesh(earGeometry, detailMat);
    leftEar.position.set(-0.1, 0.7, 0.45);
    leftEar.castShadow = true;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, detailMat);
    rightEar.position.set(0.1, 0.7, 0.45);
    rightEar.castShadow = true;
    group.add(rightEar);
    
    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), detailMat);
    tail.position.set(0, 0.35, -0.5);
    tail.rotation.x = Math.PI / 3;
    tail.castShadow = true;
    group.add(tail);
  }

  createBirdCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.7), 
      roughness: 0.6, 
      metalness: 0.1 
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.55), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), bodyMat);
    head.position.set(0, 0.7, 0.35);
    head.castShadow = true;
    group.add(head);
    
    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), detailMat);
    beak.position.set(0, 0.65, 0.5);
    beak.rotation.x = Math.PI / 2;
    beak.castShadow = true;
    group.add(beak);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.3);
    const leftWing = new THREE.Mesh(wingGeometry, detailMat);
    leftWing.position.set(-0.35, 0.55, 0);
    leftWing.rotation.z = 0.3;
    leftWing.castShadow = true;
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, detailMat);
    rightWing.position.set(0.35, 0.55, 0);
    rightWing.rotation.z = -0.3;
    rightWing.castShadow = true;
    group.add(rightWing);
  }

  createDragonCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.3 });
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.7), 
      roughness: 0.5, 
      metalness: 0.2 
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.0), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.4), bodyMat);
    head.position.set(0, 0.55, 0.7);
    head.castShadow = true;
    group.add(head);
    
    // Snout
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), detailMat);
    snout.position.set(0, 0.5, 1.0);
    snout.rotation.x = Math.PI / 2;
    snout.castShadow = true;
    group.add(snout);
    
    // Horns
    const hornGeometry = new THREE.ConeGeometry(0.06, 0.2, 6);
    const leftHorn = new THREE.Mesh(hornGeometry, detailMat);
    leftHorn.position.set(-0.12, 0.8, 0.65);
    leftHorn.rotation.z = 0.3;
    leftHorn.castShadow = true;
    group.add(leftHorn);
    
    const rightHorn = new THREE.Mesh(hornGeometry, detailMat);
    rightHorn.position.set(0.12, 0.8, 0.65);
    rightHorn.rotation.z = -0.3;
    rightHorn.castShadow = true;
    group.add(rightHorn);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.3);
    const leftWing = new THREE.Mesh(wingGeometry, detailMat);
    leftWing.position.set(-0.5, 0.6, 0.1);
    leftWing.rotation.z = 0.5;
    leftWing.castShadow = true;
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, detailMat);
    rightWing.position.set(0.5, 0.6, 0.1);
    rightWing.rotation.z = -0.5;
    rightWing.castShadow = true;
    group.add(rightWing);
    
    // Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), detailMat);
    tail.position.set(0, 0.35, -0.7);
    tail.rotation.x = -Math.PI / 2;
    tail.castShadow = true;
    group.add(tail);
  }

  createWhaleCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.7), 
      roughness: 0.6, 
      metalness: 0.1 
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.1), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), bodyMat);
    head.position.set(0, 0.45, 0.65);
    head.castShadow = true;
    group.add(head);
    
    // Fins
    const finGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.3);
    const leftFin = new THREE.Mesh(finGeometry, detailMat);
    leftFin.position.set(-0.4, 0.25, 0);
    leftFin.rotation.z = 0.3;
    leftFin.castShadow = true;
    group.add(leftFin);
    
    const rightFin = new THREE.Mesh(finGeometry, detailMat);
    rightFin.position.set(0.4, 0.25, 0);
    rightFin.rotation.z = -0.3;
    rightFin.castShadow = true;
    group.add(rightFin);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.3);
    const tail = new THREE.Mesh(tailGeometry, detailMat);
    tail.position.set(0, 0.35, -0.7);
    tail.rotation.y = 0.3;
    tail.castShadow = true;
    group.add(tail);
  }

  createTurtleCreature(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });
    const shellMat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.6), 
      roughness: 0.7, 
      metalness: 0.1 
    });
    
    // Shell
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 8), shellMat);
    shell.position.y = 0.4;
    shell.rotation.x = Math.PI / 2;
    shell.castShadow = true;
    group.add(shell);
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), bodyMat);
    head.position.set(0, 0.25, 0.55);
    head.castShadow = true;
    group.add(head);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.2);
    const positions = [
      [-0.3, 0.15, 0.3],
      [0.3, 0.15, 0.3],
      [-0.3, 0.15, -0.3],
      [0.3, 0.15, -0.3]
    ];
    
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, bodyMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  createBallCreature(group, color) {
    const material = new THREE.MeshStandardMaterial({ 
      color: color, 
      roughness: 0.3, 
      metalness: 0.4,
      emissive: color,
      emissiveIntensity: 0.2
    });
    
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), material);
    sphere.position.y = 0.4;
    sphere.castShadow = true;
    group.add(sphere);
    
    // Add some floating rings
    const ringGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(color).multiplyScalar(0.8),
      roughness: 0.4,
      metalness: 0.6
    });
    
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.position.y = 0.4;
    ring1.rotation.x = Math.PI / 2;
    ring1.castShadow = true;
    group.add(ring1);
    
    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring2.position.y = 0.4;
    ring2.rotation.y = Math.PI / 2;
    ring2.castShadow = true;
    group.add(ring2);
  }

  addCreatureToCollection(creature) {
    this.creatureCollection.set(creature.id, creature);
    gameState.creatures = Array.from(this.creatureCollection.values());
  }

  removeCreatureFromCollection(creatureId) {
    const creature = this.creatureCollection.get(creatureId);
    if (creature) {
      if (creature.mesh) {
        this.gameEngine.scene.remove(creature.mesh);
      }
      this.creatureCollection.delete(creatureId);
      gameState.creatures = Array.from(this.creatureCollection.values());
    }
  }

  getCreatureById(creatureId) {
    return this.creatureCollection.get(creatureId);
  }

  getAllCreatures() {
    return Array.from(this.creatureCollection.values());
  }

  getTotalIncome() {
    let total = 0;
    this.creatureCollection.forEach(creature => {
      total += creature.incomePerSec;
    });
    return total;
  }

  updateCreatures(delta) {
    this.creatureCollection.forEach(creature => {
      if (!creature.mesh) return;
      
      // Simple roaming behavior
      const now = performance.now() / 1000;
      
      // Update position towards target
      const direction = new THREE.Vector3()
        .subVectors(creature.targetPosition, creature.mesh.position)
        .normalize();
      
      if (direction.length() > 0.1) {
        creature.mesh.position.addScaledVector(direction, creature.speed * delta);
        creature.mesh.lookAt(creature.targetPosition);
      } else {
        // Pick new random target
        this.pickNewTarget(creature);
      }
      
      // Update creature data
      creature.position.copy(creature.mesh.position);
    });
  }

  pickNewTarget(creature) {
    // Pick a random position within the player's base area
    const range = 8;
    creature.targetPosition.set(
      8 + (Math.random() - 0.5) * range,
      0,
      -4 + (Math.random() - 0.5) * range
    );
  }

  placeCreatureOnPedestal(creature, pedestal) {
    if (!creature.mesh) {
      this.createCreatureMesh(creature);
    }
    
    creature.mesh.position.copy(pedestal.position);
    creature.mesh.position.y = 1.2;
    
    pedestal.userData.creatureId = creature.id;
    pedestal.userData.hasBlock = false;
    
    creature.pedestalId = pedestal.userData.index;
  }

  removeCreatureFromPedestal(pedestal) {
    const creatureId = pedestal.userData.creatureId;
    if (creatureId) {
      const creature = this.creatureCollection.get(creatureId);
      if (creature) {
        creature.pedestalId = null;
        this.pickNewTarget(creature);
      }
      pedestal.userData.creatureId = null;
    }
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

  cleanup() {
    this.creatureCollection.forEach(creature => {
      if (creature.mesh) {
        this.gameEngine.scene.remove(creature.mesh);
      }
    });
    this.creatureCollection.clear();
  }
}