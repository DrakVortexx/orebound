import { AuthScreen } from './ui/auth/AuthScreen.js';
import { DashboardScreen } from './ui/dashboard/DashboardScreen.js';
import { ServerSelectScreen } from './ui/servers/ServerSelectScreen.js';
import { Game } from './game/Game.js';
import { gameState } from './game/GameState.js';
import './ui/auth/auth.css';
import './ui/dashboard/dashboard.css';
import './ui/servers/server-select.css';
import './ui/game-ui.css';
import './ui/shop/shop.css';
import './ui/leaderboard/leaderboard.css';
import './ui/tutorial/tutorial.css';

class App {
  constructor() {
    this.container = document.getElementById('app');
    this.currentScreen = null;
    this.game = null;
    
    this.init();
  }

  init() {
    this.showAuthScreen();
  }

  showAuthScreen() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new AuthScreen(this.container);
    
    // Check if auth was skipped (user already has token)
    if (this.currentScreen.isAuthSkipped) {
      this.showDashboard();
      return;
    }
    
    this.currentScreen.onAuthSuccess(() => {
      this.showDashboard();
    });
  }

  showDashboard() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new DashboardScreen(this.container);
    this.currentScreen.onPlayClick(() => {
      this.showServerSelect();
    });
    this.currentScreen.onLogout(() => {
      this.showAuthScreen();
    });
  }

  showServerSelect() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new ServerSelectScreen(this.container);
    this.currentScreen.onBack(() => {
      this.showDashboard();
    });
    this.currentScreen.onServerJoin((server) => {
      this.startGame();
    });
  }

  async startGame() {
    this.cleanupCurrentScreen();
    
    this.game = new Game(this.container);
    await this.game.start();
    
    this.game.onLeave(() => {
      this.showDashboard();
    });
  }

  cleanupCurrentScreen() {
    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }
    
    if (this.game) {
      this.game.stop();
      this.game = null;
    }
  }
}

// Start the app
const app = new App();
