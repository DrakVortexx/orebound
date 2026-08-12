import { gameState } from '../../game/GameState.js';
import { api } from '../../networking/API.js';
import { LeaderboardScreen } from '../leaderboard/LeaderboardScreen.js';
import '../leaderboard/leaderboard.css';

export class DashboardScreen {
  constructor(container) {
    this.container = container;
    this.activities = [];
    this.onPlayClick = null;
    this.onLogout = null;
    this.render();
    this.loadActivity();
  }

  async loadActivity() {
    try {
      const activities = await api.getActivity();
      this.activities = activities;
      this.render();
    } catch (error) {
      console.error('Failed to load activity:', error);
      this.activities = [];
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-background"></div>
        
        <nav class="dashboard-nav">
          <div class="nav-logo">
            <h1>OREBOUND</h1>
          </div>
          <div class="nav-menu">
            <button class="nav-btn active" data-section="home">Home</button>
            <button class="nav-btn" data-section="inventory">Inventory</button>
            <button class="nav-btn" data-section="settings">Settings</button>
          </div>
          <div class="nav-user">
            <span class="user-name">${gameState.user?.username || 'Player'}</span>
            <button class="logout-btn" id="logoutBtn">Logout</button>
          </div>
        </nav>

        <main class="dashboard-main">
          <section class="dashboard-section home-section active">
            <div class="player-stats">
              <div class="stat-card money-card">
                <div class="stat-icon">$</div>
                <div class="stat-info">
                  <span class="stat-label">Money</span>
                  <span class="stat-value">$${this.formatNumber(gameState.money)}</span>
                </div>
              </div>

              <div class="stat-card generators-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-info">
                  <span class="stat-label">Generators</span>
                  <span class="stat-value">${gameState.placedGenerators.length}</span>
                </div>
              </div>

              <div class="stat-card plot-card">
                <div class="stat-icon">🏠</div>
                <div class="stat-info">
                  <span class="stat-label">Plot Size</span>
                  <span class="stat-value">Level ${gameState.plot.size}</span>
                </div>
              </div>

              <div class="stat-card rank-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-info">
                  <span class="stat-label">Rank</span>
                  <span class="stat-value">#${this.calculateRank()}</span>
                </div>
              </div>
            </div>

            <div class="play-section">
              <div class="play-card">
                <h2>Ready to Play?</h2>
                <p>Mine ores, build your empire, and dominate the leaderboard</p>
                <button class="play-btn" id="playBtn">
                  <span class="play-icon">▶</span>
                  PLAY NOW
                </button>
              </div>
            </div>

            <div class="leaderboard-section">
              <div class="leaderboard-card">
                <h2>🏆 BALTOP Leaderboard</h2>
                <p>See the richest players in OREBOUND</p>
                <button class="leaderboard-btn" id="leaderboardBtn">
                  View Leaderboard
                </button>
              </div>
            </div>

            <div class="recent-activity">
              <h3>Recent Activity</h3>
              <div class="activity-list">
                ${this.activities.length > 0 
                  ? this.activities.map(activity => `
                      <div class="activity-item">
                        <span class="activity-time">${activity.time || 'Just now'}</span>
                        <span class="activity-text">${activity.text}</span>
                        <span class="activity-value">${activity.value}</span>
                      </div>
                    `).join('')
                  : '<p class="no-activity">No recent activity</p>'
                }
              </div>
            </div>
          </section>

          <section class="dashboard-section inventory-section">
            <h2>Inventory</h2>
            <div class="inventory-grid">
              ${this.renderInventory()}
            </div>
          </section>

          <section class="dashboard-section settings-section">
            <h2>Settings</h2>
            <div class="settings-container">
              <div class="setting-group">
                <h3>Account</h3>
                <div class="setting-item">
                  <label>Username</label>
                  <input type="text" value="${gameState.user?.username || 'Player'}" readonly>
                </div>
              </div>

              <div class="setting-group">
                <h3>Graphics</h3>
                <div class="setting-item">
                  <label>Graphics Quality</label>
                  <select>
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>Shadows</label>
                  <input type="checkbox" checked>
                </div>
              </div>

              <div class="setting-group">
                <h3>Audio</h3>
                <div class="setting-item">
                  <label>Master Volume</label>
                  <input type="range" min="0" max="100" value="80">
                </div>
                <div class="setting-item">
                  <label>Music Volume</label>
                  <input type="range" min="0" max="100" value="60">
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderInventory() {
    const items = Object.entries(gameState.inventory);
    
    if (items.length === 0) {
      return '<p class="empty-inventory">Your inventory is empty</p>';
    }

    return items.map(([itemId, quantity]) => `
      <div class="inventory-item">
        <div class="item-icon">${this.getItemIcon(itemId)}</div>
        <div class="item-info">
          <span class="item-name">${this.formatItemName(itemId)}</span>
          <span class="item-quantity">x${quantity}</span>
        </div>
      </div>
    `).join('');
  }

  getItemIcon(itemId) {
    const icons = {
      stone: '🪨',
      coal: '⚫',
      copper: '🔶',
      iron: '🔩',
      gold: '🥇',
      emerald: '💚',
      diamond: '💎',
      crystal: '🔮'
    };
    return icons[itemId] || '📦';
  }

  formatItemName(itemId) {
    return itemId.charAt(0).toUpperCase() + itemId.slice(1);
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  calculateRank() {
    // This would come from the leaderboard API
    return Math.floor(Math.random() * 100) + 1;
  }

  attachEventListeners() {
    // Navigation
    const navBtns = this.container.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });

    // Play button
    const playBtn = this.container.querySelector('#playBtn');
    playBtn.addEventListener('click', () => {
      gameState.currentScreen = 'serverSelect';
      const playEvent = new CustomEvent('playClick');
      window.dispatchEvent(playEvent);
    });

    // Leaderboard button
    const leaderboardBtn = this.container.querySelector('#leaderboardBtn');
    leaderboardBtn.addEventListener('click', () => {
      this.showLeaderboard();
    });

    // Logout button
    const logoutBtn = this.container.querySelector('#logoutBtn');
    logoutBtn.addEventListener('click', async () => {
      try {
        await api.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
      gameState.reset();
      const logoutEvent = new CustomEvent('logout');
      window.dispatchEvent(logoutEvent);
    });
  }

  switchSection(section) {
    // Update nav buttons
    const navBtns = this.container.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Update sections
    const sections = this.container.querySelectorAll('.dashboard-section');
    sections.forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = this.container.querySelector(`.${section}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }

  showLeaderboard() {
    if (!this.leaderboardScreen) {
      this.leaderboardScreen = new LeaderboardScreen(this.container);
    }
  }

  closeLeaderboard() {
    if (this.leaderboardScreen) {
      this.leaderboardScreen.destroy();
      this.leaderboardScreen = null;
    }
  }

  update() {
    // Update dynamic elements
    const moneyValue = this.container.querySelector('.money-card .stat-value');
    if (moneyValue) {
      moneyValue.textContent = `$${this.formatNumber(gameState.money)}`;
    }

    const generatorsValue = this.container.querySelector('.generators-card .stat-value');
    if (generatorsValue) {
      generatorsValue.textContent = gameState.placedGenerators.length;
    }

    const plotValue = this.container.querySelector('.plot-card .stat-value');
    if (plotValue) {
      plotValue.textContent = `Level ${gameState.plot.size}`;
    }
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
