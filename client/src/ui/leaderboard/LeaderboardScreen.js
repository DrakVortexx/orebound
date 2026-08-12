import { api } from '../../networking/API.js';
import { gameState } from '../../game/GameState.js';

export class LeaderboardScreen {
  constructor(container) {
    this.container = container;
    this.leaderboardData = [];
    this.isLoading = false;
    this.onBack = null;
    this.render();
    this.loadLeaderboard();
  }

  render() {
    this.container.innerHTML = `
      <div class="leaderboard-screen">
        <div class="leaderboard-background"></div>
        
        <div class="leaderboard-content">
          <header class="leaderboard-header">
            <button class="back-btn" id="backBtn">
              <span class="back-icon">←</span>
              Back
            </button>
            <h1>🏆 BALTOP</h1>
            <p class="leaderboard-subtitle">Richest Players</p>
          </header>

          <div class="leaderboard-body">
            ${this.isLoading ? this.renderLoading() : this.renderLeaderboard()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderLoading() {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    `;
  }

  renderLeaderboard() {
    if (this.leaderboardData.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h2>No leaderboard data available</h2>
          <p>Start playing to appear on the leaderboard!</p>
        </div>
      `;
    }

    const topPlayers = this.leaderboardData.slice(0, 3);
    const otherPlayers = this.leaderboardData.slice(3);

    return `
      <div class="leaderboard-podium">
        ${this.renderPodium(topPlayers)}
      </div>

      <div class="leaderboard-list">
        <div class="list-header">
          <span class="header-rank">Rank</span>
          <span class="header-player">Player</span>
          <span class="header-money">Money</span>
        </div>
        ${otherPlayers.map((player, index) => this.renderPlayerRow(player, index + 4)).join('')}
      </div>
    `;
  }

  renderPodium(topPlayers) {
    const positions = [2, 1, 3]; // 2nd, 1st, 3rd place order
    const heights = ['120px', '160px', '100px'];
    const colors = ['#9c27b0', '#ffd700', '#ff5722'];

    return `
      <div class="podium-container">
        ${positions.map((position, index) => {
          const player = topPlayers.find(p => p.rank === position);
          if (!player) return '';
          
          return `
            <div class="podium-place" style="height: ${heights[index]}">
              <div class="podium-bar" style="background: ${colors[index]}"></div>
              <div class="podium-rank">#${position}</div>
              <div class="podium-player">${player.username}</div>
              <div class="podium-money">$${this.formatMoney(player.money)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderPlayerRow(player, rank) {
    return `
      <div class="player-row ${player.isCurrentUser ? 'current-user' : ''}">
        <span class="row-rank">#${rank}</span>
        <span class="row-player">
          ${player.username}
          ${player.isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
        </span>
        <span class="row-money">$${this.formatMoney(player.money)}</span>
      </div>
    `;
  }

  formatMoney(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toString();
  }

  attachEventListeners() {
    const backBtn = this.container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
      const backEvent = new CustomEvent('leaderboardBack');
      window.dispatchEvent(backEvent);
    });
  }

  async loadLeaderboard() {
    this.isLoading = true;
    this.render();

    try {
      const data = await api.getLeaderboard();
      this.leaderboardData = this.processLeaderboardData(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.leaderboardData = [];
    }

    this.isLoading = false;
    this.render();
  }

  processLeaderboardData(data) {
    // Process real leaderboard data from API
    return data.map((player, index) => ({
      ...player,
      rank: index + 1,
      isCurrentUser: player.username === (gameState.user?.username || '')
    }));
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
