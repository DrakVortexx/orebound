import { gameState } from '../GameState.js';
import { CRATE_TYPES, GENERATOR_TYPES, ORE_TYPES } from '../GameConfig.js';

export class CrateSystem {
  constructor() {
    this.playerCrates = [];
  }

  canAffordCrate(crateType) {
    const cost = crateType.cost;
    for (const [oreId, requiredAmount] of Object.entries(cost)) {
      const available = gameState.inventory[oreId] || 0;
      if (available < requiredAmount) {
        return false;
      }
    }
    return true;
  }

  purchaseCrate(crateTypeId) {
    const crateType = CRATE_TYPES[crateTypeId.toUpperCase()];
    if (!crateType) {
      return { success: false, message: 'Invalid crate type' };
    }

    if (!this.canAffordCrate(crateType)) {
      return { success: false, message: 'Cannot afford this crate' };
    }

    // Deduct cost from inventory
    for (const [oreId, amount] of Object.entries(crateType.cost)) {
      gameState.removeFromInventory(oreId, amount);
    }

    // Create crate
    const crate = {
      id: `crate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: crateType,
      purchasedAt: Date.now(),
      unlockTime: Date.now() + crateType.unlockTime,
      isUnlocked: false,
      isOpened: false
    };

    this.playerCrates.push(crate);
    gameState.addCrate(crate);

    return {
      success: true,
      crate,
      message: `Purchased ${crateType.name}`
    };
  }

  getCrates() {
    return this.playerCrates;
  }

  getUnlockProgress(crate) {
    if (crate.isUnlocked) return 100;
    
    const elapsed = Date.now() - crate.purchasedAt;
    const progress = Math.min((elapsed / crate.type.unlockTime) * 100, 100);
    return progress;
  }

  getTimeRemaining(crate) {
    if (crate.isUnlocked) return 0;
    
    const remaining = crate.unlockTime - Date.now();
    return Math.max(0, remaining);
  }

  formatTimeRemaining(ms) {
    if (ms <= 0) return 'Ready';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  }

  checkUnlocks() {
    const now = Date.now();
    let newlyUnlocked = [];

    this.playerCrates.forEach(crate => {
      if (!crate.isUnlocked && now >= crate.unlockTime) {
        crate.isUnlocked = true;
        newlyUnlocked.push(crate);
      }
    });

    return newlyUnlocked;
  }

  openCrate(crateId) {
    const crateIndex = this.playerCrates.findIndex(c => c.id === crateId);
    if (crateIndex === -1) {
      return { success: false, message: 'Crate not found' };
    }

    const crate = this.playerCrates[crateIndex];
    
    if (!crate.isUnlocked) {
      return { success: false, message: 'Crate is not unlocked yet' };
    }

    if (crate.isOpened) {
      return { success: false, message: 'Crate has already been opened' };
    }

    // Generate rewards
    const rewards = this.generateRewards(crate.type);
    
    // Apply rewards
    this.applyRewards(rewards);
    
    // Mark as opened
    crate.isOpened = true;
    
    // Remove from active crates
    this.playerCrates.splice(crateIndex, 1);
    gameState.removeCrate(crateId);

    return {
      success: true,
      rewards,
      message: `Opened ${crate.type.name}!`
    };
  }

  generateRewards(crateType) {
    const rewards = [];
    const config = crateType.rewards;

    // Generator reward
    if (config.generators && config.generators.length > 0) {
      const generatorType = config.generators[Math.floor(Math.random() * config.generators.length)];
      const genConfig = GENERATOR_TYPES[generatorType.toUpperCase()];
      if (genConfig) {
        rewards.push({
          type: 'generator',
          item: genConfig,
          quantity: 1
        });
      }
    }

    // Ore reward
    if (config.ores && config.ores.length > 0) {
      const oreType = config.ores[Math.floor(Math.random() * config.ores.length)];
      const oreConfig = ORE_TYPES[oreType.toUpperCase()];
      if (oreConfig) {
        const quantity = Math.floor(Math.random() * 5) + 1;
        rewards.push({
          type: 'ore',
          item: oreConfig,
          quantity
        });
      }
    }

    // Money reward
    if (config.money) {
      const amount = Math.floor(Math.random() * (config.money.max - config.money.min)) + config.money.min;
      rewards.push({
        type: 'money',
        amount
      });
    }

    return rewards;
  }

  applyRewards(rewards) {
    rewards.forEach(reward => {
      switch (reward.type) {
        case 'generator':
          gameState.addGenerator(reward.item);
          break;
        case 'ore':
          gameState.addToInventory(reward.item.id, reward.quantity);
          break;
        case 'money':
          gameState.addMoney(reward.amount);
          break;
      }
    });
  }

  getAvailableCrates() {
    return Object.values(CRATE_TYPES).map(crateType => ({
      ...crateType,
      canAfford: this.canAffordCrate(crateType)
    }));
  }
}

export const crateSystem = new CrateSystem();
