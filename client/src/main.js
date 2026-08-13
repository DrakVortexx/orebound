import { AuthScreen } from './ui/auth/AuthScreen.js';
import { DashboardScreen } from './ui/dashboard/DashboardScreen.js';
import { ServerSelectScreen } from './ui/servers/ServerSelectScreen.js';
import { Game } from './game/Game.js';
import { gameState } from './game/GameState.js';
import { router } from './router.js';
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
    // Set up router callback
    router.setNavigateCallback((screen, updateHistory) => {
      this.navigateToScreen(screen, updateHistory);
    });
    
    // Listen for auth success events
    window.addEventListener('authSuccess', (e) => {
      this.navigateToScreen('dashboard');
    });
    
    // Listen for play click events
    window.addEventListener('playClick', () => {
      this.navigateToScreen('servers');
    });
    
    // Listen for logout events
    window.addEventListener('logout', () => {
      this.navigateToScreen('auth');
    });
    
    // Listen for server back events
    window.addEventListener('serverBack', () => {
      this.navigateToScreen('dashboard');
    });
    
    // Listen for server join events
    window.addEventListener('serverJoin', (e) => {
      this.navigateToScreen('game');
    });
    
    // Listen for leaderboard back events
    window.addEventListener('leaderboardBack', () => {
      if (this.currentScreen instanceof DashboardScreen) {
        this.currentScreen.closeLeaderboard();
      } else {
        // If somehow not on dashboard, go back to dashboard
        this.navigateToScreen('dashboard');
      }
    });
    
    // Listen for game leave events
    window.addEventListener('gameLeave', () => {
      this.navigateToScreen('dashboard');
    });
    
    // Listen for shop back events
    window.addEventListener('shopBack', () => {
      if (this.currentScreen instanceof DashboardScreen) {
        this.currentScreen.shopScreen?.destroy();
        this.currentScreen.shopScreen = null;
      }
    });
    
    // Listen for shop transaction events
    window.addEventListener('shopTransaction', (e) => {
      if (e.detail.success) {
        // Update game state based on transaction
        // This could trigger UI updates
      }
    });
    
    // Start with current route
    const initialScreen = router.getCurrentScreen();
    this.navigateToScreen(initialScreen, false);
  }

  navigateToScreen(screen, updateHistory = true) {
    router.navigate(screen, updateHistory);
    
    switch(screen) {
      case 'auth':
        this.showAuthScreen();
        break;
      case 'dashboard':
        this.showDashboard();
        break;
      case 'servers':
        this.showServerSelect();
        break;
      case 'game':
        this.startGame();
        break;
      default:
        this.showAuthScreen();
    }
  }

  showAuthScreen() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new AuthScreen(this.container);
    router.navigate('auth');
    
    // Check if user is already authenticated
    if (this.currentScreen.isAuthenticated) {
      // Let the event handler handle navigation
      return;
    }
  }

  showDashboard() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new DashboardScreen(this.container);
    router.navigate('dashboard');
  }

  showServerSelect() {
    this.cleanupCurrentScreen();
    
    this.currentScreen = new ServerSelectScreen(this.container);
    router.navigate('servers');
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
