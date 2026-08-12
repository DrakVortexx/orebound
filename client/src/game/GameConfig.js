export const ORE_TYPES = {
  STONE: {
    id: 'stone',
    name: 'Stone',
    rarity: 'common',
    value: 1,
    miningDifficulty: 1,
    spawnFrequency: 0.4,
    color: 0x808080,
    size: 1
  },
  COAL: {
    id: 'coal',
    name: 'Coal',
    rarity: 'common',
    value: 3,
    miningDifficulty: 2,
    spawnFrequency: 0.25,
    color: 0x1a1a1a,
    size: 0.9
  },
  COPPER: {
    id: 'copper',
    name: 'Copper',
    rarity: 'uncommon',
    value: 8,
    miningDifficulty: 3,
    spawnFrequency: 0.15,
    color: 0xb87333,
    size: 0.85
  },
  IRON: {
    id: 'iron',
    name: 'Iron',
    rarity: 'uncommon',
    value: 15,
    miningDifficulty: 4,
    spawnFrequency: 0.1,
    color: 0x434343,
    size: 0.8
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    rarity: 'rare',
    value: 50,
    miningDifficulty: 6,
    spawnFrequency: 0.05,
    color: 0xffd700,
    size: 0.75
  },
  EMERALD: {
    id: 'emerald',
    name: 'Emerald',
    rarity: 'rare',
    value: 120,
    miningDifficulty: 8,
    spawnFrequency: 0.03,
    color: 0x50c878,
    size: 0.7
  },
  DIAMOND: {
    id: 'diamond',
    name: 'Diamond',
    rarity: 'epic',
    value: 300,
    miningDifficulty: 12,
    spawnFrequency: 0.015,
    color: 0xb9f2ff,
    size: 0.65
  },
  CRYSTAL: {
    id: 'crystal',
    name: 'Crystal',
    rarity: 'legendary',
    value: 1000,
    miningDifficulty: 20,
    spawnFrequency: 0.005,
    color: 0xe6e6fa,
    size: 0.6
  }
};

export const CRATE_TYPES = {
  COMMON: {
    id: 'common',
    name: 'Common Crate',
    rarity: 'common',
    unlockTime: 30000, // 30 seconds
    cost: {
      stone: 10,
      coal: 5
    },
    rewards: {
      generators: ['basic'],
      ores: ['coal', 'copper'],
      money: { min: 10, max: 50 }
    }
  },
  RARE: {
    id: 'rare',
    name: 'Rare Crate',
    rarity: 'rare',
    unlockTime: 120000, // 2 minutes
    cost: {
      copper: 8,
      iron: 5
    },
    rewards: {
      generators: ['basic', 'industrial'],
      ores: ['iron', 'gold'],
      money: { min: 50, max: 200 }
    }
  },
  EPIC: {
    id: 'epic',
    name: 'Epic Crate',
    rarity: 'epic',
    unlockTime: 300000, // 5 minutes
    cost: {
      gold: 6,
      emerald: 3
    },
    rewards: {
      generators: ['industrial', 'advanced'],
      ores: ['emerald', 'diamond'],
      money: { min: 200, max: 800 }
    }
  },
  LEGENDARY: {
    id: 'legendary',
    name: 'Legendary Crate',
    rarity: 'legendary',
    unlockTime: 600000, // 10 minutes
    cost: {
      diamond: 4,
      crystal: 1
    },
    rewards: {
      generators: ['advanced', 'quantum'],
      ores: ['crystal'],
      money: { min: 800, max: 3000 }
    }
  }
};

export const GENERATOR_TYPES = {
  BASIC: {
    id: 'basic',
    name: 'Basic Generator',
    incomeRate: 5, // $5 per second
    cost: 100,
    size: { width: 1.5, height: 2, depth: 1.5 },
    color: 0x4a4a4a,
    description: 'A simple generator that produces steady income'
  },
  INDUSTRIAL: {
    id: 'industrial',
    name: 'Industrial Generator',
    incomeRate: 25,
    cost: 500,
    size: { width: 2, height: 2.5, depth: 2 },
    color: 0xff6600,
    description: 'Industrial-grade generator for higher output'
  },
  ADVANCED: {
    id: 'advanced',
    name: 'Advanced Generator',
    incomeRate: 150,
    cost: 2500,
    size: { width: 2.5, height: 3, depth: 2.5 },
    color: 0x00ff00,
    description: 'Advanced technology for significant income'
  },
  QUANTUM: {
    id: 'quantum',
    name: 'Quantum Generator',
    incomeRate: 1000,
    cost: 15000,
    size: { width: 3, height: 4, depth: 3 },
    color: 0x9900ff,
    description: 'Quantum technology generating massive wealth'
  }
};

export const PLOT_EXPANSION_COSTS = [
  { level: 1, cost: 500, size: 10 },
  { level: 2, cost: 2000, size: 15 },
  { level: 3, cost: 8000, size: 20 },
  { level: 4, cost: 32000, size: 25 },
  { level: 5, cost: 128000, size: 30 },
  { level: 6, cost: 512000, size: 35 },
  { level: 7, cost: 2048000, size: 40 },
  { level: 8, cost: 8192000, size: 45 },
  { level: 9, cost: 32768000, size: 50 },
  { level: 10, cost: 131072000, size: 55 }
];

export const GAME_CONFIG = {
  MAX_PLAYERS_PER_SERVER: 8,
  STEALING_HOLD_TIME: 5000, // 5 seconds
  BREAK_IN_TIME: 10000, // 10 seconds
  ORE_RESPAWN_TIME: 30000, // 30 seconds
  MINING_HIT_TIME: 1000, // 1 second per hit
  PAYOUT_INTERVAL: 1000, // 1 second
  INITIAL_MONEY: 50,
  INITIAL_PLOT_SIZE: 10
};
