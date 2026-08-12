import { gameState } from '../../game/GameState.js';
import { GAME_CONFIG } from '../../game/GameConfig.js';

export class ServerSelectScreen {
  constructor(container) {
    this.container = container;
    this.publicServers = this.generatePublicServers();
    this.render();
  }

  generatePublicServers() {
    return [
      {
        id: 'server-1',
        name: 'US East',
        region: 'North America',
        playerCount: Math.floor(Math.random() * GAME_CONFIG.MAX_PLAYERS_PER_SERVER),
        maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_SERVER,
        status: 'online',
        ping: Math.floor(Math.random() * 50) + 20
      },
      {
        id: 'server-2',
        name: 'US West',
        region: 'North America',
        playerCount: Math.floor(Math.random() * GAME_CONFIG.MAX_PLAYERS_PER_SERVER),
        maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_SERVER,
        status: 'online',
        ping: Math.floor(Math.random() * 50) + 30
      },
      {
        id: 'server-3',
        name: 'Europe Central',
        region: 'Europe',
        playerCount: Math.floor(Math.random() * GAME_CONFIG.MAX_PLAYERS_PER_SERVER),
        maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_SERVER,
        status: 'online',
        ping: Math.floor(Math.random() * 50) + 60
      },
      {
        id: 'server-4',
        name: 'Asia Pacific',
        region: 'Asia',
        playerCount: Math.floor(Math.random() * GAME_CONFIG.MAX_PLAYERS_PER_SERVER),
        maxPlayers: GAME_CONFIG.MAX_PLAYERS_PER_SERVER,
        status: 'online',
        ping: Math.floor(Math.random() * 50) + 100
      }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="server-select-container">
        <div class="server-select-background"></div>
        
        <div class="server-select-content">
          <header class="server-select-header">
            <button class="back-btn" id="backBtn">
              <span class="back-icon">←</span>
              Back to Dashboard
            </button>
            <h1>Select Server</h1>
          </header>

          <div class="server-select-body">
            <div class="server-options">
              <div class="server-option-card random-server">
                <div class="option-icon">🎲</div>
                <h2>Random Server</h2>
                <p>Automatically join an available public server</p>
                <button class="option-btn" id="randomServerBtn">Join Random</button>
              </div>

              <div class="server-option-card private-server">
                <div class="option-icon">🔒</div>
                <h2>Private Server</h2>
                <p>Create or join a private server with friends</p>
                <button class="option-btn disabled" disabled>Coming Soon</button>
              </div>
            </div>

            <div class="public-servers">
              <h2>Public Servers</h2>
              <div class="server-list">
                ${this.publicServers.map(server => this.renderServerCard(server)).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderServerCard(server) {
    const isFull = server.playerCount >= server.maxPlayers;
    const statusColor = server.status === 'online' ? '#4caf50' : '#f44336';
    const pingColor = server.ping < 50 ? '#4caf50' : server.ping < 100 ? '#ffc107' : '#f44336';

    return `
      <div class="server-card ${isFull ? 'full' : ''}" data-server-id="${server.id}">
        <div class="server-info">
          <div class="server-name">${server.name}</div>
          <div class="server-region">${server.region}</div>
        </div>
        
        <div class="server-stats">
          <div class="server-stat">
            <span class="stat-label">Players</span>
            <span class="stat-value">${server.playerCount}/${server.maxPlayers}</span>
          </div>
          
          <div class="server-stat">
            <span class="stat-label">Status</span>
            <span class="stat-value status-indicator" style="color: ${statusColor}">
              ${server.status}
            </span>
          </div>
          
          <div class="server-stat">
            <span class="stat-label">Ping</span>
            <span class="stat-value" style="color: ${pingColor}">${server.ping}ms</span>
          </div>
        </div>

        <button class="join-server-btn ${isFull ? 'disabled' : ''}" ${isFull ? 'disabled' : ''}>
          ${isFull ? 'Full' : 'Join'}
        </button>
      </div>
    `;
  }

  attachEventListeners() {
    // Back button
    const backBtn = this.container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
      gameState.currentScreen = 'dashboard';
      this.onBack?.();
    });

    // Random server button
    const randomBtn = this.container.querySelector('#randomServerBtn');
    randomBtn.addEventListener('click', () => {
      const availableServers = this.publicServers.filter(s => s.playerCount < s.maxPlayers);
      if (availableServers.length > 0) {
        const randomServer = availableServers[Math.floor(Math.random() * availableServers.length)];
        this.joinServer(randomServer);
      }
    });

    // Server cards
    const serverCards = this.container.querySelectorAll('.server-card');
    serverCards.forEach(card => {
      const joinBtn = card.querySelector('.join-server-btn');
      if (!joinBtn.classList.contains('disabled')) {
        joinBtn.addEventListener('click', () => {
          const serverId = card.dataset.serverId;
          const server = this.publicServers.find(s => s.id === serverId);
          if (server) {
            this.joinServer(server);
          }
        });
      }
    });
  }

  joinServer(server) {
    gameState.selectedServer = server;
    gameState.currentScreen = 'game';
    gameState.inGame = true;
    this.onServerJoin?.(server);
  }

  onBack(callback) {
    this.onBack = callback;
  }

  onServerJoin(callback) {
    this.onServerJoin = callback;
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
