import { GAME_CONFIG } from '../OreboundConfig.js';
import { gameState } from '../GameState.js';

export class BlueMoonSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.isActive = false;
    this.startTime = 0;
    this.duration = GAME_CONFIG.BLUE_MOON_DURATION_SECONDS;
    this.cycleTime = GAME_CONFIG.BLUE_MOON_CYCLE_SECONDS;
    this.nextEventTime = 0;
    
    // Visual elements
    this.blueMoonGlow = null;
    this.skyClovers = [];
    this.groundPlants = [];
    
    // Event modifiers
    this.luckMultiplier = 2.0;
    this.rareOreMultiplier = 3.0;
    this.specialCreatureChance = 0.15;
  }

  init() {
    // Calculate first event time
    this.nextEventTime = performance.now() / 1000 + this.cycleTime;
    
    // Create visual elements (hidden initially)
    this.createBlueMoonVisuals();
  }

  createBlueMoonVisuals() {
    // Create blue moon glow effect
    const glowGeometry = new THREE.SphereGeometry(200, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    
    this.blueMoonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.gameEngine.scene.add(this.blueMoonGlow);
    
    // Create floating clovers for sky
    const cloverGeometry = new THREE.SphereGeometry(2, 8, 8);
    const cloverMaterial = new THREE.MeshBasicMaterial({
      color: 0x90EE90,
      transparent: true,
      opacity: 0
    });
    
    for (let i = 0; i < 20; i++) {
      const clover = new THREE.Mesh(cloverGeometry, cloverMaterial);
      clover.position.set(
        (Math.random() - 0.5) * 300,
        50 + Math.random() * 50,
        (Math.random() - 0.5) * 300
      );
      clover.scale.setScalar(1 + Math.random() * 2);
      this.gameEngine.scene.add(clover);
      this.skyClovers.push(clover);
    }
  }

  update(delta) {
    const now = performance.now() / 1000;
    
    // Check if we should start a Blue Moon event
    if (!this.isActive && now >= this.nextEventTime) {
      this.startEvent();
    }
    
    // Check if event should end
    if (this.isActive && now >= this.startTime + this.duration) {
      this.endEvent();
    }
    
    // Update visuals if active
    if (this.isActive) {
      this.updateVisuals(now);
    }
  }

  startEvent() {
    this.isActive = true;
    this.startTime = performance.now() / 1000;
    
    // Show visual effects
    this.showVisuals();
    
    // Notify players
    gameState.info = "🌕 BLUE MOON EVENT! Rare rewards and increased luck!";
    
    // Broadcast event start
    this.broadcastEventStart();
  }

  endEvent() {
    this.isActive = false;
    
    // Hide visual effects
    this.hideVisuals();
    
    // Schedule next event
    this.nextEventTime = performance.now() / 1000 + this.cycleTime;
    
    // Notify players
    gameState.info = "Blue Moon event has ended.";
    
    // Broadcast event end
    this.broadcastEventEnd();
  }

  showVisuals() {
    // Fade in blue moon glow
    if (this.blueMoonGlow) {
      this.blueMoonGlow.material.opacity = 0.15;
    }
    
    // Show clovers
    this.skyClovers.forEach(clover => {
      clover.material.opacity = 0.6;
    });
    
    // Change sky color
    if (this.gameEngine.scene.background) {
      this.gameEngine.scene.background.setHex(0x1a1a3a);
    }
    
    // Change fog color
    if (this.gameEngine.scene.fog) {
      this.gameEngine.scene.fog.color.setHex(0x1a1a3a);
    }
  }

  hideVisuals() {
    // Fade out blue moon glow
    if (this.blueMoonGlow) {
      this.blueMoonGlow.material.opacity = 0;
    }
    
    // Hide clovers
    this.skyClovers.forEach(clover => {
      clover.material.opacity = 0;
    });
    
    // Restore sky color
    if (this.gameEngine.scene.background) {
      this.gameEngine.scene.background.setHex(0xbde8ff);
    }
    
    // Restore fog color
    if (this.gameEngine.scene.fog) {
      this.gameEngine.scene.fog.color.setHex(0xbde8ff);
    }
  }

  updateVisuals(now) {
    const elapsed = now - this.startTime;
    
    // Animate blue moon glow
    if (this.blueMoonGlow) {
      this.blueMoonGlow.material.opacity = 0.15 + Math.abs(Math.sin(now * 0.8)) * 0.12;
      this.blueMoonGlow.scale.setScalar(1 + Math.sin(now * 0.55) * 0.04);
    }
    
    // Animate clovers
    this.skyClovers.forEach((clover, i) => {
      clover.visible = true;
      clover.rotation.z += 0.0015 + (i % 4) * 0.0003;
      clover.position.y += Math.sin(now * 0.7 + i) * 0.01;
    });
  }

  getModifiedLuck(baseLuck) {
    if (this.isActive) {
      return baseLuck * this.luckMultiplier;
    }
    return baseLuck;
  }

  getModifiedSpawnRate(baseRate, isRare = false) {
    if (this.isActive) {
      if (isRare) {
        return baseRate * this.rareOreMultiplier;
      }
      return baseRate * 1.5;
    }
    return baseRate;
  }

  shouldSpawnSpecialCreature() {
    if (this.isActive && Math.random() < this.specialCreatureChance) {
      return true;
    }
    return false;
  }

  getModifiedReward(baseReward) {
    if (this.isActive) {
      return Math.floor(baseReward * 1.5);
    }
    return baseReward;
  }

  getTimeUntilNextEvent() {
    const now = performance.now() / 1000;
    return Math.max(0, this.nextEventTime - now);
  }

  getTimeUntilEventEnd() {
    if (!this.isActive) return 0;
    const now = performance.now() / 1000;
    return Math.max(0, (this.startTime + this.duration) - now);
  }

  broadcastEventStart() {
    // Send WebSocket message if connected
    if (gameState.websocket && gameState.websocket.readyState === WebSocket.OPEN) {
      gameState.websocket.send(JSON.stringify({
        type: 'blue_moon_start',
        startTime: this.startTime,
        duration: this.duration
      }));
    }
  }

  broadcastEventEnd() {
    // Send WebSocket message if connected
    if (gameState.websocket && gameState.websocket.readyState === WebSocket.OPEN) {
      gameState.websocket.send(JSON.stringify({
        type: 'blue_moon_end',
        endTime: performance.now() / 1000
      }));
    }
  }

  handleRemoteEventStart(data) {
    this.isActive = true;
    this.startTime = data.startTime;
    this.showVisuals();
    gameState.info = "🌕 BLUE MOON EVENT! Rare rewards and increased luck!";
  }

  handleRemoteEventEnd(data) {
    this.isActive = false;
    this.hideVisuals();
    this.nextEventTime = performance.now() / 1000 + this.cycleTime;
    gameState.info = "Blue Moon event has ended.";
  }

  cleanup() {
    this.hideVisuals();
    
    // Remove visual elements
    if (this.blueMoonGlow) {
      this.gameEngine.scene.remove(this.blueMoonGlow);
      this.blueMoonGlow.geometry.dispose();
      this.blueMoonGlow.material.dispose();
    }
    
    this.skyClovers.forEach(clover => {
      this.gameEngine.scene.remove(clover);
      clover.geometry.dispose();
      clover.material.dispose();
    });
    
    this.skyClovers = [];
    this.groundPlants = [];
  }
}