import { gameEngine } from './GameEngine.js';
import { PlayerController } from './player/PlayerController.js';
import { MobileControls } from './player/MobileControls.js';
import { GameUI } from '../ui/GameUI.js';
import { gameState } from './GameState.js';
import { ORE_TYPES, GAME_CONFIG } from './GameConfig.js';
import { api } from '../networking/API.js';
import { tutorialSystem } from '../ui/tutorial/TutorialSystem.js';
import '../ui/tutorial/tutorial.css';
import './player/mobile-controls.css';

export class Game {
  constructor(container) {
    this.container = container;
    this.isRunning = false;
    this.lastTime = 0;
    this.ores = new Map();
    this.payoutInterval = null;
  }

  async start() {
    if (this.isRunning) return;

    // Initialize game engine
    gameEngine.init(this.container);

    // Create game world
    this.createWorld();

    // Initialize player controller
    this.playerController = new PlayerController(gameEngine.camera, gameEngine.scene);
    this.playerController.setPosition(0, 2, 5);

    // Initialize mobile controls
    this.mobileControls = new MobileControls(this.playerController);

    // Initialize game UI
    this.gameUI = new GameUI(this.container);
    this.gameUI.show();
    this.gameUI.onLeaveServer(() => this.leaveServer());

    // Setup player controller callbacks
    this.setupPlayerCallbacks();

    // Connect to server
    await this.connectToServer();

    // Start game loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop(performance.now());

    // Start generator payouts
    this.startGeneratorPayouts();

    // Show tutorial if needed
    if (!gameState.tutorialCompleted) {
      this.startTutorial();
    }
  }

  createWorld() {
    // Create player plot
    gameEngine.createPlayerPlot(gameState.plot.maxX);

    // Create shop
    gameEngine.createShop();

    // Create crate area
    gameEngine.createCrateArea();

    // Spawn initial ores
    this.spawnOres();

    // Place existing generators
    gameState.placedGenerators.forEach(gen => {
      const generator = gameEngine.createGenerator(gen.generatorType, gen.position);
      this.ores.set(gen.id, generator);
    });
  }

  spawnOres() {
    const miningArea = { x: -40, z: -40, size: 80 };
    const oreCount = 50;

    for (let i = 0; i < oreCount; i++) {
      const oreType = this.getRandomOreType();
      const position = {
        x: miningArea.x + (Math.random() - 0.5) * miningArea.size,
        y: 1,
        z: miningArea.z + (Math.random() - 0.5) * miningArea.size
      };

      const ore = gameEngine.createOre(oreType, position);
      this.ores.set(ore.uuid, ore);
    }
  }

  getRandomOreType() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [key, oreType] of Object.entries(ORE_TYPES)) {
      cumulative += oreType.spawnFrequency;
      if (rand <= cumulative) {
        return oreType;
      }
    }

    return ORE_TYPES.STONE;
  }

  setupPlayerCallbacks() {
    this.playerController.onOreMined = (oreType) => {
      this.gameUI.showNotification(`+1 ${oreType.name}`, 'success');
      this.gameUI.updateInventory();
    };

    this.playerController.onInteractionStart = (target) => {
      if (target.userData.type === 'generator') {
        this.gameUI.showProgressBar(GAME_CONFIG.STEALING_HOLD_TIME);
      }
    };

    this.playerController.onInteractionComplete = (target) => {
      if (target.userData.type === 'generator') {
        this.handleGeneratorInteraction(target);
      }
    };

    this.playerController.onInteractionCancel = () => {
      this.gameUI.hideProgressBar();
    };
  }

  handleGeneratorInteraction(generator) {
    const genData = generator.userData;
    
    if (genData.isOwned) {
      // Pick up own generator
      this.pickupGenerator(generator);
    } else {
      // Steal generator
      this.stealGenerator(generator);
    }
  }

  pickupGenerator(generator) {
    const genData = generator.userData;
    gameState.removePlacedGenerator(genData.id);
    gameEngine.scene.remove(generator);
    this.gameUI.showNotification('Generator picked up', 'info');
  }

  stealGenerator(generator) {
    const genData = generator.userData;
    
    // Remove from current owner
    gameEngine.scene.remove(generator);
    
    // Add to player's inventory
    gameState.addGenerator(genData.generatorType);
    
    this.gameUI.showNotification(`Stole ${genData.generatorType.name}!`, 'warning');
    this.gameUI.updateInventory();
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

  startGeneratorPayouts() {
    this.payoutInterval = setInterval(() => {
      let totalIncome = 0;

      gameState.placedGenerators.forEach(gen => {
        const generatorType = gen.generatorType;
        const income = generatorType.incomeRate / 1000; // Per ms to per second
        totalIncome += income;
      });

      if (totalIncome > 0) {
        gameState.addMoney(totalIncome);
        this.gameUI.updateMoney(gameState.money);
      }
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
      } else if (target.userData.type === 'generator') {
        promptText = target.userData.isOwned ? 'Pick Up' : 'Steal';
      } else if (target.userData.type === 'crate') {
        promptText = 'Open';
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
    this.onLeave?.();
  }

  stop() {
    this.isRunning = false;

    if (this.payoutInterval) {
      clearInterval(this.payoutInterval);
    }

    if (this.playerController) {
      this.playerController.dispose();
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

  onLeave(callback) {
    this.onLeave = callback;
  }
}
