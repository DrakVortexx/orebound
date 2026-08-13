import { gameEngine } from './GameEngine.js';
import { PlayerController } from './player/PlayerController.js';
import { MobileControls } from './player/MobileControls.js';
import { GameUI } from '../ui/GameUI.js';
import { gameState } from './GameState.js';
import { ORE_TYPES, GAME_CONFIG } from './GameConfig.js';
import { ORE_TYPES as OREBOUND_ORES, MINING_AREAS, GAME_CONFIG as OREBOUND_CONFIG, getRankByKey } from './OreboundConfig.js';
import { api } from '../networking/API.js';
import { tutorialSystem } from '../ui/tutorial/TutorialSystem.js';
import { LuckyBlockSystem } from './luckyblocks/LuckyBlockSystem.js';
import { CreatureSystem } from './creatures/CreatureSystem.js';
import { BlueMoonSystem } from './events/BlueMoonSystem.js';
import '../ui/tutorial/tutorial.css';
import './player/mobile-controls.css';

export class Game {
  constructor(container) {
    this.container = container;
    this.isRunning = false;
    this.lastTime = 0;
    this.ores = new Map();
    this.payoutInterval = null;
    
    // OREBOUND systems
    this.luckyBlockSystem = null;
    this.creatureSystem = null;
    this.blueMoonSystem = null;
  }

  async start() {
    if (this.isRunning) return;

    try {
      // Clear container first
      this.container.innerHTML = '';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.position = 'fixed';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.background = '#232527';
      
      // Initialize game engine
      gameEngine.init(this.container);

      // Initialize OREBOUND systems
      this.luckyBlockSystem = new LuckyBlockSystem(gameEngine);
      this.creatureSystem = new CreatureSystem(gameEngine);
      this.blueMoonSystem = new BlueMoonSystem(gameEngine);
      this.blueMoonSystem.init();

      // Create game world
      this.createWorld();

      // Initialize player controller
      this.playerController = new PlayerController(gameEngine.camera, gameEngine.scene);
      this.playerController.setPosition(0, 1.65, 11);

      // Initialize mobile controls
      this.mobileControls = new MobileControls(this.playerController);

      // Initialize game UI
      this.gameUI = new GameUI(this.container);
      this.gameUI.show();
      
      // Listen for game leave events
      window.addEventListener('gameLeave', () => {
        this.leaveServer();
      });

      // Setup player controller callbacks
      this.setupPlayerCallbacks();

      // Connect to server
      await this.connectToServer();

      // Start game loop
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop(performance.now());

      // Start creature income payouts
      this.startCreaturePayouts();

      // Show tutorial if needed
      // Temporarily disabled to fix white screen issues
      // Tutorial will be fixed and re-enabled later
      if (!gameState.tutorialCompleted) {
        gameState.tutorialCompleted = true; // Skip tutorial for now
      }
    } catch (error) {
      console.error('Game start error:', error);
      this.container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: white; font-family: sans-serif; background: #232527;">
          <div style="text-align: center;">
            <h2>Failed to start game</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #00a2ff; border: none; color: white; cursor: pointer; border-radius: 4px;">Retry</button>
          </div>
        </div>
      `;
    }
  }

  createWorld() {
    // Create shop
    gameEngine.createShop();

    // Spawn initial ores using OREBOUND mining areas
    this.spawnOres();

    // Initialize Lucky Block inventory from game state
    if (gameState.luckyBlocks) {
      this.luckyBlockSystem.updateInventory(gameState.luckyBlocks);
    } else {
      // Set starting inventory
      this.luckyBlockSystem.addLuckyBlock('basic', OREBOUND_CONFIG.STARTING_LUCKY_BLOCKS.basic);
    }

    // Initialize creatures from game state
    if (gameState.creatures) {
      gameState.creatures.forEach(creatureData => {
        const creature = this.creatureSystem.generateCreature(creatureData.rankKey);
        creature.id = creatureData.id;
        creature.name = creatureData.name;
        this.creatureSystem.addCreatureToCollection(creature);
        
        // Create mesh and place on pedestal if assigned
        if (creatureData.pedestalId !== undefined) {
          const pedestal = gameEngine.pedestals[creatureData.pedestalId];
          if (pedestal) {
            this.creatureSystem.placeCreatureOnPedestal(creature, pedestal);
          }
        }
      });
    }
  }

  spawnOres() {
    // Spawn ores in each mining area
    MINING_AREAS.forEach(area => {
      const oreCount = 30;
      
      for (let i = 0; i < oreCount; i++) {
        const oreType = this.getRandomOreType(area.resources);
        const position = {
          x: area.position.x + (Math.random() - 0.5) * 50,
          y: 1,
          z: area.position.z + (Math.random() - 0.5) * 50
        };

        const ore = gameEngine.createOre(oreType, position);
        this.ores.set(ore.userData.uuid, ore);
      }
    });
  }

  getRandomOreType(availableResources) {
    const resources = availableResources || Object.keys(OREBOUND_ORES);
    const rand = Math.random();
    let cumulative = 0;
    
    // Calculate total spawn frequency for available resources
    let totalFrequency = 0;
    resources.forEach(key => {
      totalFrequency += OREBOUND_ORES[key].spawnFrequency;
    });
    
    // Normalize and select
    let normalizedRand = rand;
    for (const key of resources) {
      const normalizedFreq = OREBOUND_ORES[key].spawnFrequency / totalFrequency;
      cumulative += normalizedFreq;
      if (normalizedRand <= cumulative) {
        return OREBOUND_ORES[key];
      }
    }

    return OREBOUND_ORES.STONE;
  }

  setupPlayerCallbacks() {
    this.playerController.onOreMined = (oreType) => {
      this.gameUI.showNotification(`+1 ${oreType.name}`, 'success');
      this.gameUI.updateInventory();
    };

    this.playerController.onInteractionStart = (target) => {
      if (target.userData.type === 'plot') {
        this.handlePlotInteraction(target);
      } else if (target.userData.type === 'pedestal') {
        this.handlePedestalInteraction(target);
      }
    };

    this.playerController.onInteractionComplete = (target) => {
      if (target.userData.type === 'pedestal') {
        this.handlePedestalComplete(target);
      }
    };

    this.playerController.onInteractionCancel = () => {
      this.gameUI.hideProgressBar();
    };
  }

  handlePlotInteraction(plot) {
    if (plot.userData.stage === 0) {
      // Empty plot - try to plant seed
      if (this.luckyBlockSystem.getTotalLuckyBlocks() > 0) {
        const selected = this.luckyBlockSystem.getSelectedBlock();
        if (this.luckyBlockSystem.plantSeed(plot, getRankByKey(selected.rankKey))) {
          this.gameUI.showNotification('Seed planted!', 'success');
        } else {
          this.gameUI.showNotification('No seeds available', 'error');
        }
      } else {
        this.gameUI.showNotification('No seeds to plant', 'error');
      }
    } else if (plot.userData.stage === 2) {
      // Ready to harvest
      const reward = this.luckyBlockSystem.harvestPlot(plot);
      if (reward) {
        this.gameUI.showNotification(`Harvested ${reward.rank.label} Lucky Block!`, 'success');
        this.gameUI.updateInventory();
      }
    }
  }

  handlePedestalInteraction(pedestal) {
    if (pedestal.userData.creatureId) {
      // Creature on pedestal - sell it
      const creature = this.creatureSystem.getCreatureById(pedestal.userData.creatureId);
      if (creature) {
        const sellValue = this.calculateCreatureSellValue(creature);
        gameState.addMoney(sellValue);
        this.creatureSystem.removeCreatureFromCollection(creature.id);
        this.creatureSystem.removeCreatureFromPedestal(pedestal);
        this.gameUI.showNotification(`Sold ${creature.name} for $${sellValue}`, 'success');
        this.gameUI.updateMoney(gameState.money);
      }
    } else if (pedestal.userData.hasBlock) {
      // Lucky Block on pedestal - start opening
      this.gameUI.showProgressBar(3000); // 3 second opening
    } else {
      // Empty pedestal - try to place Lucky Block
      const selected = this.luckyBlockSystem.getSelectedBlock();
      if (this.luckyBlockSystem.getTotalLuckyBlocks() > 0) {
        if (this.luckyBlockSystem.placeLuckyBlock(pedestal, selected.rankKey, selected.mutation, selected.trait)) {
          this.gameUI.showNotification('Lucky Block placed!', 'success');
        } else {
          this.gameUI.showNotification('Failed to place block', 'error');
        }
      } else {
        this.gameUI.showNotification('No Lucky Blocks to place', 'error');
      }
    }
  }

  handlePedestalComplete(pedestal) {
    if (pedestal.userData.hasBlock && !pedestal.userData.creatureId) {
      const reward = this.luckyBlockSystem.openLuckyBlock(pedestal);
      if (reward) {
        // Handle creature reward
        const creatureReward = reward.find(r => r.type === 'creature');
        if (creatureReward) {
          const creature = this.creatureSystem.generateCreature(creatureReward.rankKey);
          this.creatureSystem.addCreatureToCollection(creature);
          this.creatureSystem.placeCreatureOnPedestal(creature, pedestal);
          this.gameUI.showNotification(`Discovered ${creature.name}!`, 'success');
        }
        
        // Handle other rewards
        const moneyReward = reward.find(r => r.type === 'money');
        if (moneyReward) {
          this.gameUI.showNotification(`+$${moneyReward.amount}`, 'success');
          this.gameUI.updateMoney(gameState.money);
        }
        
        this.gameUI.updateInventory();
      }
    }
  }

  calculateCreatureSellValue(creature) {
    const rank = getRankByKey(creature.rankKey);
    return Math.floor(rank.min * 0.5 + creature.incomePerSec * 100);
  }

  async connectToServer() {
    try {
      if (gameState.selectedServer) {
        await api.joinServer(gameState.selectedServer.id);
      }
      
      // Connect WebSocket
      api.connectWebSocket();
      api.onWebSocketMessage((message) => {
        this.handleServerMessage(message);
      });
      
      // Store WebSocket reference
      gameState.websocket = api.websocket;

    } catch (error) {
      console.error('Failed to connect to server:', error);
      this.gameUI.showNotification('Connection error - playing offline', 'warning');
    }
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'player_joined':
        this.handlePlayerJoined(message.data);
        break;
      case 'player_left':
        this.handlePlayerLeft(message.data);
        break;
      case 'player_moved':
        this.handlePlayerMoved(message.data);
        break;
      case 'generator_stolen':
        this.handleGeneratorStolen(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  handlePlayerJoined(data) {
    console.log('Player joined:', data.username);
    this.gameUI.showNotification(`${data.username} joined the server`, 'info');
  }

  handlePlayerLeft(data) {
    console.log('Player left:', data.username);
    gameState.otherPlayers.delete(data.id);
  }

  handlePlayerMoved(data) {
    // Update other player position
    const player = gameState.otherPlayers.get(data.id);
    if (player) {
      player.position = data.position;
    }
  }

  handleGeneratorStolen(data) {
    if (data.victimId === gameState.user.id) {
      this.gameUI.showNotification('Your generator was stolen!', 'error');
    }
  }

  startCreaturePayouts() {
    this.payoutInterval = setInterval(() => {
      // Update Blue Moon system
      this.blueMoonSystem.update(1);
      
      // Update creatures
      this.creatureSystem.updateCreatures(1);
      
      // Calculate creature income
      let totalIncome = this.creatureSystem.getTotalIncome();
      
      // Apply Blue Moon bonus if active
      if (this.blueMoonSystem.isActive) {
        totalIncome = this.blueMoonSystem.getModifiedReward(totalIncome);
      }
      
      if (totalIncome > 0) {
        gameState.addMoney(totalIncome);
        this.gameUI.updateMoney(gameState.money);
      }
      
      // Update game state with current systems
      gameState.luckyBlocks = this.luckyBlockSystem.getInventory();
      gameState.creatures = this.creatureSystem.getAllCreatures();
    }, GAME_CONFIG.PAYOUT_INTERVAL);
  }

  startTutorial() {
    tutorialSystem.start();
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;

    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update player
    if (this.playerController) {
      this.playerController.update(delta);
    }

    // Update Blue Moon system
    if (this.blueMoonSystem) {
      this.blueMoonSystem.update(delta);
    }

    // Update creatures
    if (this.creatureSystem) {
      this.creatureSystem.updateCreatures(delta);
    }

    // Update interaction prompts
    this.updateInteractionPrompts();

    // Respawn ores periodically
    this.respawnOres(delta);

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  updateInteractionPrompts() {
    if (this.playerController.currentTarget) {
      const target = this.playerController.currentTarget;
      let promptText = 'Interact';

      if (target.userData.type === 'ore') {
        promptText = 'Mine (Click)';
      } else if (target.userData.type === 'plot') {
        if (target.userData.stage === 0) {
          promptText = '[E] Plant Seed';
        } else if (target.userData.stage === 1) {
          promptText = 'Growing...';
        } else if (target.userData.stage === 2) {
          promptText = '[E] Harvest Lucky Block';
        }
      } else if (target.userData.type === 'pedestal') {
        if (target.userData.creatureId) {
          promptText = '[E] Sell Creature';
        } else if (target.userData.hasBlock) {
          promptText = '[F] Open Lucky Block | [E] Store';
        } else {
          promptText = '[E] Place Lucky Block';
        }
      } else if (target.userData.type === 'luckyBlock') {
        promptText = 'Lucky Block';
      }

      this.gameUI.showInteractionPrompt(promptText);
    } else {
      this.gameUI.hideInteractionPrompt();
    }
  }

  respawnOres(delta) {
    // Simple ore respawn logic
    if (Math.random() < 0.01) { // 1% chance per frame
      const oreType = this.getRandomOreType();
      const position = {
        x: -40 + (Math.random() - 0.5) * 80,
        y: 1,
        z: -40 + (Math.random() - 0.5) * 80
      };

      const ore = gameEngine.createOre(oreType, position);
      this.ores.set(ore.uuid, ore);
    }
  }

  leaveServer() {
    this.stop();
    gameState.currentScreen = 'dashboard';
    gameState.inGame = false;
    const gameLeaveEvent = new CustomEvent('gameLeave');
    window.dispatchEvent(gameLeaveEvent);
  }

  stop() {
    this.isRunning = false;

    if (this.payoutInterval) {
      clearInterval(this.payoutInterval);
    }

    if (this.playerController) {
      this.playerController.dispose();
    }
    
    if (this.creatureSystem) {
      this.creatureSystem.cleanup();
    }
    
    if (this.blueMoonSystem) {
      this.blueMoonSystem.cleanup();
    }

    if (this.mobileControls) {
      this.mobileControls.destroy();
    }

    if (this.gameUI) {
      this.gameUI.destroy();
    }

    gameEngine.cleanup();
    api.disconnectWebSocket();

    // Clean up ores
    this.ores.clear();
  }
}
