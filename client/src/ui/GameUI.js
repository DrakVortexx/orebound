import { gameState } from '../game/GameState.js';
import { ShopScreen } from './shop/ShopScreen.js';
import './shop/shop.css';

export class GameUI {
  constructor(container) {
    this.container = container;
    this.isVisible = false;
    this.shopScreen = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="game-ui" id="gameUI" style="display: none;">
        <!-- Top HUD -->
        <div class="game-hud-top">
          <div class="hud-player-info">
            <span class="player-name">${gameState.user?.username || 'Player'}</span>
            <span class="server-name">${gameState.selectedServer?.name || 'Server'}</span>
          </div>

          <div class="hud-money">
            <span class="money-icon">$</span>
            <span class="money-value" id="moneyValue">${this.formatMoney(gameState.money)}</span>
          </div>

          <div class="hud-buttons">
            <button class="hud-btn" id="inventoryBtn">
              <span class="btn-icon">📦</span>
              <span class="btn-label">Inventory</span>
            </button>
            <button class="hud-btn" id="shopBtn">
              <span class="btn-icon">🛒</span>
              <span class="btn-label">Shop</span>
            </button>
            <button class="hud-btn" id="menuBtn">
              <span class="btn-icon">☰</span>
              <span class="btn-label">Menu</span>
            </button>
          </div>
        </div>

        <!-- Interaction Prompt -->
        <div class="interaction-prompt" id="interactionPrompt" style="display: none;">
          <div class="prompt-content">
            <span class="prompt-key">E</span>
            <span class="prompt-text" id="promptText">Interact</span>
          </div>
        </div>

        <!-- Progress Bar (for interactions) -->
        <div class="progress-bar" id="progressBar" style="display: none;">
          <div class="progress-fill" id="progressFill"></div>
          <span class="progress-text" id="progressText">0%</span>
        </div>

        <!-- Notification Toast -->
        <div class="notification-container" id="notificationContainer"></div>

        <!-- Game Menu -->
        <div class="game-menu" id="gameMenu" style="display: none;">
          <div class="menu-content">
            <h2>Game Menu</h2>
            <div class="menu-buttons">
              <button class="menu-btn" id="resumeBtn">Resume</button>
              <button class="menu-btn" id="settingsBtn">Settings</button>
              <button class="menu-btn danger" id="leaveBtn">Leave Server</button>
            </div>
          </div>
        </div>

        <!-- Inventory Panel -->
        <div class="inventory-panel" id="inventoryPanel" style="display: none;">
          <div class="panel-header">
            <h2>Inventory</h2>
            <button class="close-btn" id="closeInventoryBtn">×</button>
          </div>
          <div class="panel-content">
            <div class="inventory-grid" id="inventoryGrid">
              ${this.renderInventoryItems()}
            </div>
          </div>
        </div>

        <!-- Minimap -->
        <div class="minimap">
          <div class="minimap-content">
            <div class="minimap-player"></div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderInventoryItems() {
    const items = Object.entries(gameState.inventory);
    
    if (items.length === 0) {
      return '<p class="empty-message">Your inventory is empty</p>';
    }

    return items.map(([itemId, quantity]) => `
      <div class="inventory-slot">
        <div class="slot-icon">${this.getItemIcon(itemId)}</div>
        <div class="slot-quantity">${quantity}</div>
        <div class="slot-name">${this.formatItemName(itemId)}</div>
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

  formatMoney(amount) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  attachEventListeners() {
    // HUD buttons
    const inventoryBtn = this.container.querySelector('#inventoryBtn');
    inventoryBtn.addEventListener('click', () => this.toggleInventory());

    const shopBtn = this.container.querySelector('#shopBtn');
    shopBtn.addEventListener('click', () => this.toggleShop());

    const menuBtn = this.container.querySelector('#menuBtn');
    menuBtn.addEventListener('click', () => this.toggleMenu());

    // Game menu
    const resumeBtn = this.container.querySelector('#resumeBtn');
    resumeBtn.addEventListener('click', () => this.toggleMenu());

    const leaveBtn = this.container.querySelector('#leaveBtn');
    leaveBtn.addEventListener('click', () => this.onLeaveServer?.());

    // Inventory panel
    const closeInventoryBtn = this.container.querySelector('#closeInventoryBtn');
    closeInventoryBtn.addEventListener('click', () => this.toggleInventory());

    // Escape key to close panels
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const menu = this.container.querySelector('#gameMenu');
        const inventory = this.container.querySelector('#inventoryPanel');

        if (menu.style.display !== 'none') {
          this.toggleMenu();
        } else if (inventory.style.display !== 'none') {
          this.toggleInventory();
        } else if (this.shopScreen) {
          this.shopScreen.destroy();
          this.shopScreen = null;
        }
      }
    });
  }

  show() {
    this.isVisible = true;
    this.container.querySelector('#gameUI').style.display = 'block';
  }

  hide() {
    this.isVisible = false;
    this.container.querySelector('#gameUI').style.display = 'none';
  }

  toggleMenu() {
    const menu = this.container.querySelector('#gameMenu');
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  }

  toggleInventory() {
    const inventory = this.container.querySelector('#inventoryPanel');
    const isOpen = inventory.style.display !== 'none';
    
    inventory.style.display = isOpen ? 'none' : 'flex';
    
    if (!isOpen) {
      this.updateInventory();
    }
  }

  toggleShop() {
    if (!this.shopScreen) {
      this.shopScreen = new ShopScreen(this.container);
      this.shopScreen.onBack(() => {
        this.shopScreen.destroy();
        this.shopScreen = null;
      });
      this.shopScreen.onTransaction((result) => {
        if (result.success) {
          this.showNotification(result.message, 'success');
          this.updateMoney(gameState.money);
          this.updateInventory();
        }
      });
    }
  }

  updateInventory() {
    const grid = this.container.querySelector('#inventoryGrid');
    grid.innerHTML = this.renderInventoryItems();
  }

  updateMoney(amount) {
    const moneyValue = this.container.querySelector('#moneyValue');
    moneyValue.textContent = this.formatMoney(amount);
  }

  showInteractionPrompt(text) {
    const prompt = this.container.querySelector('#interactionPrompt');
    const promptText = this.container.querySelector('#promptText');
    promptText.textContent = text;
    prompt.style.display = 'flex';
  }

  hideInteractionPrompt() {
    const prompt = this.container.querySelector('#interactionPrompt');
    prompt.style.display = 'none';
  }

  showProgressBar(duration) {
    const progressBar = this.container.querySelector('#progressBar');
    const progressFill = this.container.querySelector('#progressFill');
    const progressText = this.container.querySelector('#progressText');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    let startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      progressFill.style.width = progress + '%';
      progressText.textContent = Math.round(progress) + '%';

      if (progress < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        progressBar.style.display = 'none';
      }
    };

    updateProgress();
  }

  hideProgressBar() {
    const progressBar = this.container.querySelector('#progressBar');
    progressBar.style.display = 'none';
  }

  showNotification(message, type = 'info') {
    const container = this.container.querySelector('#notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${this.getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
    `;
    
    container.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      money: '💰'
    };
    return icons[type] || 'ℹ️';
  }

  onLeaveServer(callback) {
    this.onLeaveServer = callback;
  }

  destroy() {
    if (this.shopScreen) {
      this.shopScreen.destroy();
      this.shopScreen = null;
    }
    this.container.innerHTML = '';
  }
}
