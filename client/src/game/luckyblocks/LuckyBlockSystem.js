import { getRankByKey, getRandomRankForPlant, getGrowthTime, GAME_CONFIG } from '../OreboundConfig.js';
import { gameState } from '../GameState.js';

export class LuckyBlockSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.luckyBlocks = new Map();
    this.inventory = {
      normal: this.createEmptyRankInventory(),
      bluemoon: this.createEmptyRankInventory(),
      soulbound: this.createEmptyRankInventory()
    };
    this.selectedBlock = {
      rankKey: 'basic',
      mutation: 'normal',
      trait: 'none'
    };
  }

  createEmptyRankInventory() {
    return {
      basic: 0,
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
      godly: 0,
      secret: 0,
      transcendent: 0,
      omniversal: 0
    };
  }

  addLuckyBlock(rankKey, amount = 1, mutation = 'normal', trait = 'none') {
    const mutationType = mutation === 'bluemoon' ? 'bluemoon' : 
                          mutation === 'soulbound' ? 'soulbound' : 'normal';
    
    this.inventory[mutationType][rankKey] += amount;
    
    // Update game state
    gameState.luckyBlocks = this.inventory;
  }

  removeLuckyBlock(rankKey, amount = 1, mutation = 'normal', trait = 'none') {
    const mutationType = mutation === 'bluemoon' ? 'bluemoon' : 
                          mutation === 'soulbound' ? 'soulbound' : 'normal';
    
    if (this.inventory[mutationType][rankKey] >= amount) {
      this.inventory[mutationType][rankKey] -= amount;
      gameState.luckyBlocks = this.inventory;
      return true;
    }
    return false;
  }

  getTotalLuckyBlocks() {
    let total = 0;
    for (const mutationType of Object.keys(this.inventory)) {
      for (const count of Object.values(this.inventory[mutationType])) {
        total += count;
      }
    }
    return total;
  }

  plantSeed(plot, seedRank = null) {
    if (plot.userData.stage !== 0) return false; // Plot must be empty
    
    const rank = seedRank || getRandomRankForPlant();
    const growthTime = getGrowthTime(rank.key);
    
    // Remove seed from inventory
    if (!this.removeLuckyBlock(rank.key, 1, 'normal', 'none')) {
      return false;
    }
    
    // Update plot state
    plot.userData.stage = 1; // Growing
    plot.userData.plantedAt = performance.now() / 1000;
    plot.userData.growDuration = growthTime;
    plot.userData.seedRank = rank;
    plot.userData.mutation = 'normal';
    plot.userData.trait = 'none';
    
    // Create growth visual
    this.createGrowthVisual(plot, rank);
    
    return true;
  }

  createGrowthVisual(plot, rank) {
    // Create a simple sprout that will grow
    const sproutGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const sproutMaterial = new THREE.MeshStandardMaterial({
      color: this.getRankColor(rank.key),
      roughness: 0.6,
      metalness: 0.2
    });
    
    const sprout = new THREE.Mesh(sproutGeometry, sproutMaterial);
    sprout.position.set(plot.position.x, 0.5, plot.position.z);
    sprout.scale.setScalar(0.2);
    sprout.castShadow = true;
    
    this.gameEngine.scene.add(sprout);
    plot.userData.growthMesh = sprout;
  }

  harvestPlot(plot) {
    if (plot.userData.stage !== 2) return null; // Plot must be ready
    
    const rank = plot.userData.seedRank;
    const mutation = plot.userData.mutation;
    const trait = plot.userData.trait;
    
    // Add Lucky Block to inventory
    this.addLuckyBlock(rank.key, 1, mutation, trait);
    
    // Remove visual elements
    if (plot.userData.readyBlock) {
      this.gameEngine.scene.remove(plot.userData.readyBlock);
      plot.userData.readyBlock = null;
    }
    
    // Reset plot
    plot.userData.stage = 0;
    plot.userData.plantedAt = 0;
    plot.userData.growDuration = 0;
    plot.userData.seedRank = null;
    plot.userData.mutation = 'normal';
    plot.userData.trait = 'none';
    
    return { rank, mutation, trait };
  }

  placeLuckyBlock(pedestal, rankKey, mutation = 'normal', trait = 'none') {
    if (pedestal.userData.hasBlock || pedestal.userData.creatureId) return false;
    
    if (!this.removeLuckyBlock(rankKey, 1, mutation, trait)) {
      return false;
    }
    
    // Create Lucky Block mesh
    const block = this.gameEngine.createLuckyBlock(rankKey, {
      x: pedestal.position.x,
      y: 1.5,
      z: pedestal.position.z
    }, mutation, trait);
    
    // Update pedestal state
    pedestal.userData.hasBlock = true;
    pedestal.userData.blockRankKey = rankKey;
    pedestal.userData.blockMutation = mutation;
    pedestal.userData.blockTrait = trait;
    pedestal.userData.block = block;
    
    return true;
  }

  openLuckyBlock(pedestal) {
    if (!pedestal.userData.hasBlock || pedestal.userData.creatureId) return null;
    
    const rankKey = pedestal.userData.blockRankKey;
    const mutation = pedestal.userData.blockMutation;
    const trait = pedestal.userData.blockTrait;
    
    // Generate reward
    const reward = this.generateReward(rankKey, mutation, trait);
    
    // Remove block from pedestal
    if (pedestal.userData.block) {
      this.gameEngine.scene.remove(pedestal.userData.block);
    }
    
    // Reset pedestal
    pedestal.userData.hasBlock = false;
    pedestal.userData.blockRankKey = null;
    pedestal.userData.blockMutation = 'normal';
    pedestal.userData.blockTrait = 'none';
    pedestal.userData.block = null;
    
    // Apply reward
    this.applyReward(reward);
    
    // Create opening effects
    this.createOpeningEffects(pedestal.position, rankKey);
    
    return reward;
  }

  generateReward(rankKey, mutation, trait) {
    const rank = getRankByKey(rankKey);
    
    // Reward probabilities based on rank
    const rewards = [];
    
    // Always give some money based on rank
    const baseMoney = rank.min + Math.floor(Math.random() * (rank.max - rank.min));
    rewards.push({ type: 'money', amount: baseMoney });
    
    // Chance for creature (higher ranks = better chance)
    const creatureChance = Math.min(0.1 + (rank.weight * 0.01), 0.8);
    if (Math.random() < creatureChance) {
      rewards.push({ type: 'creature', rankKey: rankKey });
    }
    
    // Chance for resources
    if (Math.random() < 0.5) {
      rewards.push({ type: 'resources', amount: Math.floor(rank.min / 2) });
    }
    
    // Special rewards for high ranks
    if (['legendary', 'mythic', 'godly', 'secret', 'transcendent', 'omniversal'].includes(rankKey)) {
      if (Math.random() < 0.3) {
        rewards.push({ type: 'seed', rankKey: rankKey });
      }
    }
    
    return rewards;
  }

  applyReward(rewards) {
    rewards.forEach(reward => {
      switch (reward.type) {
        case 'money':
          gameState.addMoney(reward.amount);
          break;
        case 'creature':
          // Will be handled by creature system
          gameState.addCreature(reward.rankKey);
          break;
        case 'resources':
          // Will be handled by resource system
          gameState.addResources(reward.amount);
          break;
        case 'seed':
          this.addLuckyBlock(reward.rankKey, 1, 'normal', 'none');
          break;
      }
    });
  }

  createOpeningEffects(position, rankKey) {
    const color = this.getRankColor(rankKey);
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const offset = {
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 2,
        z: (Math.random() - 0.5) * 2
      };
      
      this.gameEngine.createParticle({
        x: position.x + offset.x,
        y: position.y + offset.y,
        z: position.z + offset.z
      }, color, 5);
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

  setSelectedBlock(rankKey, mutation, trait) {
    this.selectedBlock = { rankKey, mutation, trait };
  }

  getSelectedBlock() {
    return this.selectedBlock;
  }

  updateInventory(newInventory) {
    this.inventory = newInventory;
    gameState.luckyBlocks = this.inventory;
  }

  getInventory() {
    return this.inventory;
  }
}