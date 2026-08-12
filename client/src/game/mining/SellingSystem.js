import { gameState } from '../GameState.js';
import { ORE_TYPES } from '../GameConfig.js';

export class SellingSystem {
  constructor() {
    this.sellPrices = this.calculateSellPrices();
  }

  calculateSellPrices() {
    const prices = {};
    for (const [key, oreType] of Object.entries(ORE_TYPES)) {
      prices[oreType.id] = oreType.value;
    }
    return prices;
  }

  canSell(oreId, quantity = 1) {
    const available = gameState.inventory[oreId] || 0;
    return available >= quantity;
  }

  calculateTotal(oreId, quantity) {
    const price = this.sellPrices[oreId] || 0;
    return price * quantity;
  }

  sell(oreId, quantity = 1) {
    if (!this.canSell(oreId, quantity)) {
      return { success: false, message: 'Not enough ore to sell' };
    }

    const total = this.calculateTotal(oreId, quantity);
    
    // Remove from inventory
    gameState.removeFromInventory(oreId, quantity);
    
    // Add money
    gameState.addMoney(total);
    
    return {
      success: true,
      total,
      oreId,
      quantity,
      message: `Sold ${quantity} ${this.formatOreName(oreId)} for $${total}`
    };
  }

  sellAll() {
    let totalEarned = 0;
    const soldItems = [];

    for (const [oreId, quantity] of Object.entries(gameState.inventory)) {
      if (this.sellPrices[oreId]) {
        const result = this.sell(oreId, quantity);
        if (result.success) {
          totalEarned += result.total;
          soldItems.push({
            oreId,
            quantity: result.quantity,
            earned: result.total
          });
        }
      }
    }

    return {
      success: true,
      totalEarned,
      soldItems,
      message: `Sold all items for $${totalEarned}`
    };
  }

  getSellableInventory() {
    const items = [];
    for (const [oreId, quantity] of Object.entries(gameState.inventory)) {
      if (this.sellPrices[oreId] && quantity > 0) {
        items.push({
          oreId,
          name: this.formatOreName(oreId),
          quantity,
          price: this.sellPrices[oreId],
          total: this.calculateTotal(oreId, quantity)
        });
      }
    }
    return items.sort((a, b) => b.price - a.price);
  }

  formatOreName(oreId) {
    const oreType = Object.values(ORE_TYPES).find(o => o.id === oreId);
    return oreType ? oreType.name : oreId.charAt(0).toUpperCase() + oreId.slice(1);
  }

  getPrice(oreId) {
    return this.sellPrices[oreId] || 0;
  }
}

export const sellingSystem = new SellingSystem();
