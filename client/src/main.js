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
    // Listen for auth success events
    window.addEventListener('authSuccess', (e) => {
      this.showDashboard();
    });
    
    // Listen for play click events
    window.addEventListener('playClick', () => {
      this.showServerSelect();
    });
    
    // Listen for logout events
    window.addEventListener('logout', () => {
      this.showAuthScreen();
    });
    
    // Listen for server back events
    window.addEventListener('serverBack', () => {
      this.showDashboard();
    });
    
    // Listen for server join events
    window.addEventListener('serverJoin', (e) => {
      this.startGame();
    });
    
    // Listen for leaderboard back events
    window.addEventListener('leaderboardBack', () => {
      if (this.currentScreen instanceof DashboardScreen) {
        this.currentScreen.closeLeaderboard();
      }
    });
    
    // Listen for game leave events
    window.addEventListener('gameLeave', () => {
      this.showDashboard();
    });
    
    // Listen for shop back events
    window.addEventListener('shopBack', () => {
      if (this.currentScreen instanceof DashboardScreen) {
        this.currentScreen.shopScreen?.destroy();
        this.currentScreen.shopScreen = null;
      }
    });
    
    this.showAuthScreen();
  }

  showAuthScreen() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new AuthScreen(this.container);
    
    // Check if user is already authenticated
    if (this.currentScreen.isAuthenticated) {
      // Let the event handler handle navigation
      return;
    }
  }

  showDashboard() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new DashboardScreen(this.container);
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
