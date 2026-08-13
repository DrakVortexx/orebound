class Router {
  constructor() {
    this.routes = {
      '/': 'auth',
      '/login': 'auth',
      '/dashboard': 'dashboard',
      '/servers': 'servers',
      '/play': 'game',
      '/leaderboard': 'leaderboard'
    };
    
    this.currentRoute = null;
    this.navigateCallback = null;
    
    this.init();
  }

  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.screen) {
        this.navigateCallback?.(e.state.screen, false);
      }
    });

    // Handle initial load
    const path = window.location.pathname;
    const screen = this.routes[path] || 'auth';
    
    if (screen !== 'auth') {
      // Set initial state
      window.history.replaceState({ screen }, '', path);
    }
  }

  setNavigateCallback(callback) {
    this.navigateCallback = callback;
  }

  navigate(screen, updateHistory = true) {
    const path = this.getPathForScreen(screen);
    
    if (updateHistory) {
      window.history.pushState({ screen }, '', path);
    }
    
    this.currentRoute = screen;
    window.history.replaceState({ screen }, '', path);
  }

  getPathForScreen(screen) {
    for (const [path, screenName] of Object.entries(this.routes)) {
      if (screenName === screen) {
        return path;
      }
    }
    return '/';
  }

  getCurrentScreen() {
    const path = window.location.pathname;
    return this.routes[path] || 'auth';
  }
}

export const router = new Router();