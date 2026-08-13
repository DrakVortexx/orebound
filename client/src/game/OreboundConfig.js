// OREBOUND Game Configuration
// Based on the example game in client/examples

export const RANKS = [
  { key: "basic", label: "Basic", min: 1, max: 3, weight: 50, color: "c-basic" },
  { key: "common", label: "Common", min: 4, max: 8, weight: 30, color: "c-common" },
  { key: "uncommon", label: "Uncommon", min: 10, max: 15, weight: 15, color: "c-uncommon" },
  { key: "rare", label: "Rare", min: 20, max: 35, weight: 7.5, color: "c-rare" },
  { key: "epic", label: "Epic", min: 50, max: 80, weight: 3.5, color: "c-epic" },
  { key: "legendary", label: "Legendary", min: 100, max: 200, weight: 1.5, color: "c-legendary" },
  { key: "mythic", label: "Mythic", min: 2000, max: 3000, weight: 1, color: "c-mythic" },
  { key: "godly", label: "Godly", min: 50000, max: 120000, weight: 0.1, color: "c-godly" },
  { key: "secret", label: "Secret", min: 5000000, max: 10000000, weight: 0.001, color: "c-secret" },
  { key: "transcendent", label: "Transcendent", min: 100000000, max: 250000000, weight: 0.0001, color: "c-transcendent" },
  { key: "omniversal", label: "Omniversal", min: 300000000, max: 900000000, weight: 0.00001, color: "c-omniversal" }
];

export const SPECIAL_BLOCKS = [
  { key: "valentinesblock", label: "Valentine's Day", baseRankKey: "legendary", color: "c-epic" },
  { key: "leprechaunblock", label: "Leprechaun", baseRankKey: "secret", color: "c-godly" },
  { key: "adminblock", label: "Admin", baseRankKey: "transcendent", color: "c-admin" },
  { key: "godlyblock", label: "Godly", baseRankKey: "omniversal", color: "c-godly" },
  { key: "secretblock", label: "Secret", baseRankKey: "secret", color: "c-secret" }
];

export const MUTATION_KEYS = ["normal", "bluemoon", "soulbound"];
export const TRAIT_KEYS = ["none", "leprechaun"];

export const RANK_MULT = Object.fromEntries(RANKS.map((r, i) => [r.key, 1 + i * 0.28]));

export const GROW_TIME_BY_RANK = {
  basic: [2, 2],
  common: [3, 5],
  uncommon: [5, 8],
  rare: [8, 12],
  epic: [18, 25],
  legendary: [25, 40],
  mythic: [40, 70],
  godly: [70, 120],
  secret: [120, 240],
  transcendent: [10800, 21600],
  omniversal: [43200, 86400]
};

export const PLANT_ODDS = {
  basic: 45,
  common: 25,
  uncommon: 18,
  rare: 12,
  epic: 7,
  legendary: 3,
  mythic: 1,
  godly: 0.1,
  secret: 0.01,
  transcendent: 0.0001,
  omniversal: 0.00001
};

// Mining resources
export const ORE_TYPES = {
  STONE: { name: "Stone", value: 1, spawnFrequency: 0.4, color: 0x808080 },
  COAL: { name: "Coal", value: 2, spawnFrequency: 0.25, color: 0x1a1a1a },
  COPPER: { name: "Copper", value: 5, spawnFrequency: 0.15, color: 0xb87333 },
  IRON: { name: "Iron", value: 8, spawnFrequency: 0.10, color: 0xaaaaaa },
  GOLD: { name: "Gold", value: 15, spawnFrequency: 0.05, color: 0xffd700 },
  DIAMOND: { name: "Diamond", value: 25, spawnFrequency: 0.03, color: 0x00ffff },
  EMERALD: { name: "Emerald", value: 35, spawnFrequency: 0.015, color: 0x50c878 },
  NETHERITE: { name: "Netherite", value: 50, spawnFrequency: 0.005, color: 0x3e3e3e },
  OREBOUND: { name: "OREBOUND", value: 100, spawnFrequency: 0.001, color: 0x9400d3 }
};

// Mining areas
export const MINING_AREAS = [
  { key: "starter", label: "Starter Mine", minTier: 0, resources: ["STONE", "COAL", "COPPER"], position: { x: -40, z: -40 } },
  { key: "deep", label: "Deep Mine", minTier: 1, resources: ["IRON", "GOLD", "COPPER"], position: { x: -80, z: -40 } },
  { key: "crystal", label: "Crystal Cavern", minTier: 2, resources: ["DIAMOND", "EMERALD", "GOLD"], position: { x: -40, z: -80 } },
  { key: "molten", label: "Molten Depths", minTier: 3, resources: ["NETHERITE", "DIAMOND", "EMERALD"], position: { x: -80, z: -80 } },
  { key: "void", label: "Void Mine", minTier: 4, resources: ["OREBOUND", "NETHERITE"], position: { x: -120, z: -120 } }
];

// Game constants
export const GAME_CONFIG = {
  STARTING_MONEY: 120,
  STARTING_SEEDS: 7,
  STARTING_LUCKY_BLOCKS: { basic: 2 },
  MAX_REBIRTHS: 10,
  PERSONAL_LUCK_MAX: 1000,
  SAVE_INTERVAL_SECONDS: 5,
  BLUE_MOON_CYCLE_SECONDS: 1800, // 30 minutes
  BLUE_MOON_DURATION_SECONDS: 300, // 5 minutes
  TUTORIAL_LAST_STEP: 8
};

// Creature archetypes
export const CREATURE_ARCHETYPES = ["feline", "canid", "bird", "dragon", "whale", "turtle", "ball"];

// Shop items
export const SHOP_ITEMS = {
  seeds: {
    basic: { cost: 10, label: "Basic Seed", rankKey: "basic" },
    common: { cost: 50, label: "Common Seed", rankKey: "common" },
    uncommon: { cost: 200, label: "Uncommon Seed", rankKey: "uncommon" },
    rare: { cost: 1000, label: "Rare Seed", rankKey: "rare" },
    epic: { cost: 5000, label: "Epic Seed", rankKey: "epic" },
    legendary: { cost: 25000, label: "Legendary Seed", rankKey: "legendary" }
  },
  upgrades: {
    fertilizer: { cost: 1000, label: "Fertilizer Tier", maxTier: 5 },
    plotExpansion: { cost: 5000, label: "Plot Expansion", maxTier: 10 },
    creatureCap: { cost: 3000, label: "Creature Capacity", maxTier: 8 }
  }
};

// Helper functions
export function getRankByKey(key) {
  return RANKS.find(r => r.key === key) || RANKS[0];
}

export function getBlockMetaByKey(key) {
  const special = SPECIAL_BLOCKS.find(b => b.key === key);
  if (special) {
    return { ...special, ...getRankByKey(special.baseRankKey) };
  }
  return getRankByKey(key);
}

export function getRandomRankForPlant() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const [key, odds] of Object.entries(PLANT_ODDS)) {
    cumulative += odds;
    if (rand <= cumulative) {
      return getRankByKey(key);
    }
  }
  
  return getRankByKey("basic");
}

export function getGrowthTime(rankKey) {
  const times = GROW_TIME_BY_RANK[rankKey] || GROW_TIME_BY_RANK.basic;
  const min = times[0];
  const max = times[1];
  return min + Math.random() * (max - min);
}