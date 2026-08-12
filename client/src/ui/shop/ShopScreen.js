import { sellingSystem } from '../../game/mining/SellingSystem.js';
import { crateSystem } from '../../game/crates/CrateSystem.js';
import { GENERATOR_TYPES, PLOT_EXPANSION_COSTS } from '../../game/GameConfig.js';
import { gameState } from '../../game/GameState.js';

export class ShopScreen {
  constructor(container) {
    this.container = container;
    this.currentTab = 'sell';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="shop-screen">
        <div class="shop-background"></div>
        
        <div class="shop-content">
          <header class="shop-header">
            <button class="back-btn" id="backBtn">
              <span class="back-icon">←</span>
              Back
            </button>
            <h1>Shop</h1>
            <div class="shop-money">
              <span class="money-icon">$</span>
              <span class="money-value">${this.formatMoney(gameState.money)}</span>
            </div>
          </header>

          <div class="shop-tabs">
            <button class="shop-tab ${this.currentTab === 'sell' ? 'active' : ''}" data-tab="sell">
              <span class="tab-icon">💰</span>
              Sell Ores
            </button>
            <button class="shop-tab ${this.currentTab === 'crates' ? 'active' : ''}" data-tab="crates">
              <span class="tab-icon">📦</span>
              Crates
            </button>
            <button class="shop-tab ${this.currentTab === 'generators' ? 'active' : ''}" data-tab="generators">
              <span class="tab-icon">⚡</span>
              Generators
            </button>
            <button class="shop-tab ${this.currentTab === 'expansion' ? 'active' : ''}" data-tab="expansion">
              <span class="tab-icon">🏠</span>
              Plot Expansion
            </button>
          </div>

          <div class="shop-body">
            <div class="shop-panel ${this.currentTab === 'sell' ? 'active' : ''}" id="sellPanel">
              ${this.renderSellPanel()}
            </div>
            <div class="shop-panel ${this.currentTab === 'crates' ? 'active' : ''}" id="cratesPanel">
              ${this.renderCratesPanel()}
            </div>
            <div class="shop-panel ${this.currentTab === 'generators' ? 'active' : ''}" id="generatorsPanel">
              ${this.renderGeneratorsPanel()}
            </div>
            <div class="shop-panel ${this.currentTab === 'expansion' ? 'active' : ''}" id="expansionPanel">
              ${this.renderExpansionPanel()}
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderSellPanel() {
    const items = sellingSystem.getSellableInventory();
    
    if (items.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🪨</div>
          <h2>No ores to sell</h2>
          <p>Go mine some ores to sell them for money!</p>
        </div>
      `;
    }

    return `
      <div class="sell-grid">
        ${items.map(item => `
          <div class="sell-item">
            <div class="item-header">
              <span class="item-icon">${this.getOreIcon(item.oreId)}</span>
              <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">x${item.quantity}</span>
              </div>
            </div>
            <div class="item-price">
              <span class="price-label">Price each:</span>
              <span class="price-value">$${item.price}</span>
            </div>
            <div class="item-total">
              <span class="total-label">Total:</span>
              <span class="total-value">$${item.total}</span>
            </div>
            <button class="sell-btn" data-ore-id="${item.oreId}" data-quantity="${item.quantity}">
              Sell All
            </button>
          </div>
        `).join('')}
      </div>
      <button class="sell-all-btn" id="sellAllBtn">Sell Everything</button>
    `;
  }

  renderCratesPanel() {
    const crates = crateSystem.getAvailableCrates();
    
    return `
      <div class="crates-grid">
        ${crates.map(crate => `
          <div class="crate-item ${crate.canAfford ? 'affordable' : 'unaffordable'}">
            <div class="crate-header">
              <span class="crate-rarity ${crate.rarity}">${crate.rarity}</span>
              <h3>${crate.name}</h3>
            </div>
            <div class="crate-cost">
              <span class="cost-label">Cost:</span>
              <div class="cost-items">
                ${Object.entries(crate.cost).map(([oreId, amount]) => `
                  <span class="cost-item">
                    ${this.getOreIcon(oreId)} x${amount}
                  </span>
                `).join('')}
              </div>
            </div>
            <div class="crate-time">
              <span class="time-label">Unlock time:</span>
              <span class="time-value">${this.formatTime(crate.unlockTime)}</span>
            </div>
            <div class="crate-rewards">
              <span class="rewards-label">Rewards:</span>
              <ul class="rewards-list">
                <li>Generators: ${crate.rewards.generators.join(', ')}</li>
                <li>Ores: ${crate.rewards.ores.join(', ')}</li>
                <li>Money: $${crate.rewards.money.min} - $${crate.rewards.money.max}</li>
              </ul>
            </div>
            <button class="purchase-btn ${crate.canAfford ? '' : 'disabled'}" 
                    data-crate-type="${crate.id}" 
                    ${crate.canAfford ? '' : 'disabled'}>
              ${crate.canAfford ? 'Purchase' : 'Cannot Afford'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderGeneratorsPanel() {
    const generators = Object.values(GENERATOR_TYPES);
    
    return `
      <div class="generators-grid">
        ${generators.map(gen => `
          <div class="generator-item ${gameState.money >= gen.cost ? 'affordable' : 'unaffordable'}">
            <div class="generator-header">
              <h3>${gen.name}</h3>
              <span class="generator-income">$${gen.incomeRate}/sec</span>
            </div>
            <div class="generator-description">
              <p>${gen.description}</p>
            </div>
            <div class="generator-stats">
              <div class="stat">
                <span class="stat-label">Cost:</span>
                <span class="stat-value">$${gen.cost}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Size:</span>
                <span class="stat-value">${gen.size.width}x${gen.size.height}x${gen.size.depth}</span>
              </div>
            </div>
            <button class="purchase-btn ${gameState.money >= gen.cost ? '' : 'disabled'}" 
                    data-generator-type="${gen.id}" 
                    ${gameState.money >= gen.cost ? '' : 'disabled'}>
              ${gameState.money >= gen.cost ? 'Purchase' : 'Cannot Afford'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderExpansionPanel() {
    const currentLevel = gameState.plot.size;
    const nextExpansion = PLOT_EXPANSION_COSTS.find(e => e.level === currentLevel + 1);
    
    if (!nextExpansion) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <h2>Maximum Plot Size Reached</h2>
          <p>You have the largest plot available!</p>
        </div>
      `;
    }

    return `
      <div class="expansion-panel">
        <div class="current-plot">
          <h3>Current Plot</h3>
          <div class="plot-stats">
            <div class="stat">
              <span class="stat-label">Level:</span>
              <span class="stat-value">${currentLevel}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Size:</span>
              <span class="stat-value">${gameState.plot.maxX}x${gameState.plot.maxZ}</span>
            </div>
          </div>
        </div>

        <div class="expansion-arrow">↓</div>

        <div class="next-expansion">
          <h3>Next Expansion</h3>
          <div class="expansion-stats">
            <div class="stat">
              <span class="stat-label">New Level:</span>
              <span class="stat-value">${nextExpansion.level}</span>
            </div>
            <div class="stat">
              <span class="stat-label">New Size:</span>
              <span class="stat-value">${nextExpansion.size}x${nextExpansion.size}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Cost:</span>
              <span class="stat-value">$${nextExpansion.cost}</span>
            </div>
          </div>
          <button class="expand-btn ${gameState.money >= nextExpansion.cost ? '' : 'disabled'}" 
                  ${gameState.money >= nextExpansion.cost ? '' : 'disabled'}>
            ${gameState.money >= nextExpansion.cost ? 'Expand Plot' : 'Cannot Afford'}
          </button>
        </div>
      </div>
    `;
  }

  getOreIcon(oreId) {
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
    return icons[oreId] || '📦';
  }

  formatMoney(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toString();
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  attachEventListeners() {
    // Back button
    const backBtn = this.container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
      const shopBackEvent = new CustomEvent('shopBack');
      window.dispatchEvent(shopBackEvent);
    });

    // Tab switching
    const tabs = this.container.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Sell buttons
    const sellBtns = this.container.querySelectorAll('.sell-btn');
    sellBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const oreId = e.target.dataset.oreId;
        const quantity = parseInt(e.target.dataset.quantity);
        this.sellOre(oreId, quantity);
      });
    });

    // Sell all button
    const sellAllBtn = this.container.querySelector('#sellAllBtn');
    if (sellAllBtn) {
      sellAllBtn.addEventListener('click', () => this.sellAll());
    }

    // Crate purchase buttons
    const crateBtns = this.container.querySelectorAll('.purchase-btn[data-crate-type]');
    crateBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crateType = e.target.dataset.crateType;
        this.purchaseCrate(crateType);
      });
    });

    // Generator purchase buttons
    const genBtns = this.container.querySelectorAll('.purchase-btn[data-generator-type]');
    genBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const genType = e.target.dataset.generatorType;
        this.purchaseGenerator(genType);
      });
    });

    // Expand button
    const expandBtn = this.container.querySelector('.expand-btn');
    if (expandBtn && !expandBtn.classList.contains('disabled')) {
      expandBtn.addEventListener('click', () => this.expandPlot());
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    this.render();
  }

  sellOre(oreId, quantity) {
    const result = sellingSystem.sell(oreId, quantity);
    if (result.success) {
      this.render();
      const transactionEvent = new CustomEvent('shopTransaction', { detail: { result } });
      window.dispatchEvent(transactionEvent);
    }
  }

  sellAll() {
    const result = sellingSystem.sellAll();
    if (result.success) {
      this.render();
      const transactionEvent = new CustomEvent('shopTransaction', { detail: { result } });
      window.dispatchEvent(transactionEvent);
    }
  }

  purchaseCrate(crateType) {
    const result = crateSystem.purchaseCrate(crateType);
    if (result.success) {
      this.render();
      const transactionEvent = new CustomEvent('shopTransaction', { detail: { result } });
      window.dispatchEvent(transactionEvent);
    }
  }

  purchaseGenerator(genType) {
    const genConfig = GENERATOR_TYPES[genType.toUpperCase()];
    if (!genConfig) return;

    if (gameState.money < genConfig.cost) {
      return;
    }

    gameState.removeMoney(genConfig.cost);
    gameState.addGenerator(genConfig);
    
    this.render();
    this.onTransaction?.({
      success: true,
      message: `Purchased ${genConfig.name}`
    });
  }

  expandPlot() {
    const currentLevel = gameState.plot.size;
    const expansion = PLOT_EXPANSION_COSTS.find(e => e.level === currentLevel + 1);
    
    if (!expansion || gameState.money < expansion.cost) {
      return;
    }

    gameState.removeMoney(expansion.cost);
    gameState.expandPlot();
    
    this.render();
    const expansionEvent = new CustomEvent('shopTransaction', { 
      detail: {
        success: true,
        message: `Plot expanded to level ${gameState.plot.size}`
      }
    });
    window.dispatchEvent(expansionEvent);
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
