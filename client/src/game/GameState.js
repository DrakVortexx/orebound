export class GameState {
  constructor() {
    this.currentScreen = 'auth'; // auth, dashboard, serverSelect, game
    this.isAuthenticated = false;
    this.user = null;
    this.money = 0;
    this.inventory = {};
    this.generators = [];
    this.placedGenerators = [];
    this.plot = {
      size: 1,
      maxX: 10,
      maxZ: 10
    };
    this.crates = [];
    this.selectedServer = null;
    this.tutorialCompleted = false;
    this.tutorialStep = 0;
    this.inGame = false;
    this.playerPosition = { x: 0, y: 0, z: 0 };
    this.otherPlayers = new Map();
    
    // OREBOUND-specific properties
    this.luckyBlocks = {
      normal: this.createEmptyRankInventory(),
      bluemoon: this.createEmptyRankInventory(),
      soulbound: this.createEmptyRankInventory()
    };
    this.creatures = [];
    this.selectedBlock = {
      rankKey: 'basic',
      mutation: 'normal',
      trait: 'none'
    };
    this.websocket = null;
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

  setUser(user) {
    this.user = user;
    this.isAuthenticated = true;
  }

  addMoney(amount) {
    this.money += amount;
  }

  removeMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  addToInventory(item, quantity = 1) {
    if (!this.inventory[item]) {
      this.inventory[item] = 0;
    }
    this.inventory[item] += quantity;
  }

  removeFromInventory(item, quantity = 1) {
    if (this.inventory[item] && this.inventory[item] >= quantity) {
      this.inventory[item] -= quantity;
      if (this.inventory[item] === 0) {
        delete this.inventory[item];
      }
      return true;
    }
    return false;
  }

  addGenerator(generator) {
    this.generators.push(generator);
  }

  placeGenerator(generator, position) {
    const placed = {
      ...generator,
      position,
      placedAt: Date.now(),
      lastPayout: Date.now()
    };
    this.placedGenerators.push(placed);
    return placed;
  }

  removePlacedGenerator(generatorId) {
    const index = this.placedGenerators.findIndex(g => g.id === generatorId);
    if (index !== -1) {
      const removed = this.placedGenerators.splice(index, 1)[0];
      this.addGenerator(removed);
      return removed;
    }
    return null;
  }

  expandPlot() {
    this.plot.size++;
    this.plot.maxX += 5;
    this.plot.maxZ += 5;
  }

  addCrate(crate) {
    this.crates.push(crate);
  }

  removeCrate(crateId) {
    const index = this.crates.findIndex(c => c.id === crateId);
    if (index !== -1) {
      return this.crates.splice(index, 1)[0];
    }
    return null;
  }

  updateTutorialStep(step) {
    this.tutorialStep = step;
    if (step >= 16) {
      this.tutorialCompleted = true;
    }
  }

  addCreature(rankKey) {
    const creature = {
      id: Math.random().toString(36).substr(2, 9),
      rankKey: rankKey,
      pedestalId: null,
      obtainedAt: Date.now()
    };
    this.creatures.push(creature);
    return creature;
  }

  removeCreature(creatureId) {
    const index = this.creatures.findIndex(c => c.id === creatureId);
    if (index !== -1) {
      return this.creatures.splice(index, 1)[0];
    }
    return null;
  }

  addResources(amount) {
    // Generic resource addition for OREBOUND
    if (!this.inventory.resources) {
      this.inventory.resources = 0;
    }
    this.inventory.resources += amount;
  }

  reset() {
    this.currentScreen = 'auth';
    this.isAuthenticated = false;
    this.user = null;
    this.money = 0;
    this.inventory = {};
    this.generators = [];
    this.placedGenerators = [];
    this.plot = {
      size: 1,
      maxX: 10,
      maxZ: 10
    };
    this.crates = [];
    this.selectedServer = null;
    this.tutorialCompleted = false;
    this.tutorialStep = 0;
    this.inGame = false;
    this.playerPosition = { x: 0, y: 0, z: 0 };
    this.otherPlayers.clear();
    
    // Reset OREBOUND properties
    this.luckyBlocks = {
      normal: this.createEmptyRankInventory(),
      bluemoon: this.createEmptyRankInventory(),
      soulbound: this.createEmptyRankInventory()
    };
    this.creatures = [];
    this.selectedBlock = {
      rankKey: 'basic',
      mutation: 'normal',
      trait: 'none'
    };
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export const gameState = new GameState();
