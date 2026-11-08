'use strict';

require('dotenv').config();

const http = require('http');
const path = require('path');
const { randomUUID } = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const PORT = clampInt(process.env.PORT, 3000, 1, 65535);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const MAX_PLAYERS_PER_ROOM = clampInt(process.env.MAX_PLAYERS_PER_ROOM, 8, 1, 32);
const MAX_ROOMS = clampInt(process.env.MAX_ROOMS, 24, 1, 200);
const SERVE_STATIC = process.env.SERVE_STATIC !== 'false';
const NODE_ENV = process.env.NODE_ENV || 'development';
const TICK_MS = 50;
const SNAPSHOT_MS = 100;
const ROOM_IDLE_MS = 30000;
const DROP_LIFETIME_MS = 120000;
const INVENTORY_CAP = 80;
const WORLD_MARGIN = 120;
const PLAYER_RADIUS = 16;
const PLAYER_MAX_SPEED = 238;
const PLAYER_ACCEL = 1900;
const PLAYER_FRICTION = 2300;
const PICKUP_RADIUS = 92;
const MINING_REACH = 138;
const DROP_CAP = 180;
const MAX_PICKUPS_PER_ACTION = 8;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(JSON.stringify({
    level: 'fatal',
    message: 'missing_supabase_environment',
    required: ['SUPABASE_URL', 'SUPABASE_SECRET_KEY']
  }));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const RARITIES = {
  Common: { rank: 0, color: '#9aa7bd' },
  Uncommon: { rank: 1, color: '#4ade80' },
  Rare: { rank: 2, color: '#60a5fa' },
  Epic: { rank: 3, color: '#c084fc' },
  Legendary: { rank: 4, color: '#fbbf24' },
  Mythic: { rank: 5, color: '#fb7185' }
};

const ORES = {
  coal: { id: 'coal', name: 'Coal', rarity: 'Common', rarityRank: 0, value: 7, duration: 1.65, xp: 5, color: '#5c6576' },
  copper: { id: 'copper', name: 'Copper', rarity: 'Uncommon', rarityRank: 1, value: 16, duration: 2.25, xp: 9, color: '#e08a4b' },
  iron: { id: 'iron', name: 'Iron', rarity: 'Rare', rarityRank: 2, value: 38, duration: 3.05, xp: 17, color: '#c3ccdb' },
  gold: { id: 'gold', name: 'Gold', rarity: 'Epic', rarityRank: 3, value: 95, duration: 4.15, xp: 34, color: '#f7c948' },
  sapphire: { id: 'sapphire', name: 'Sapphire', rarity: 'Legendary', rarityRank: 4, value: 240, duration: 5.4, xp: 62, color: '#4d8dff' },
  diamond: { id: 'diamond', name: 'Diamond', rarity: 'Legendary', rarityRank: 4, value: 340, duration: 5.95, xp: 82, color: '#37e6f0' },
  ruby: { id: 'ruby', name: 'Ruby', rarity: 'Mythic', rarityRank: 5, value: 430, duration: 6.7, xp: 104, color: '#ff4d6a' },
  emerald: { id: 'emerald', name: 'Emerald', rarity: 'Mythic', rarityRank: 5, value: 450, duration: 6.85, xp: 108, color: '#3ce07a' }
};

const ORE_ORDER = ['coal', 'copper', 'iron', 'gold', 'sapphire', 'diamond', 'ruby', 'emerald'];

const PICKAXES = {
  basic: { id: 'basic', name: 'Basic Pickaxe', price: 0, speed: 1, levelRequired: 1, color: '#94a3b8' },
  iron: { id: 'iron', name: 'Iron Pickaxe', price: 300, speed: 1.35, levelRequired: 2, color: '#cbd5e1' },
  steel: { id: 'steel', name: 'Steel Pickaxe', price: 1000, speed: 1.75, levelRequired: 4, color: '#93c5fd' },
  gold: { id: 'gold', name: 'Gold Pickaxe', price: 3000, speed: 2.2, levelRequired: 7, color: '#fbbf24' },
  crystal: { id: 'crystal', name: 'Crystal Pickaxe', price: 8500, speed: 2.8, levelRequired: 11, color: '#67e8f9' },
  obsidian: { id: 'obsidian', name: 'Obsidian Pickaxe', price: 22000, speed: 3.5, levelRequired: 16, color: '#a78bfa' },
  void: { id: 'void', name: 'Void Pickaxe', price: 60000, speed: 4.5, levelRequired: 22, color: '#f472b6' }
};

const PICKAXE_ORDER = ['basic', 'iron', 'steel', 'gold', 'crystal', 'obsidian', 'void'];

const MINES = {
  mossy: {
    id: 'mossy', name: 'Mossy Hollow', levelRequired: 1, cost: 0, tier: 1, valueMult: 1, oreChance: 0.76,
    size: { w: 2400, h: 1600 }, theme: 'mossy', accent: '#34d399',
    weights: { coal: 100, copper: 58, iron: 18, gold: 3.2, sapphire: 0.5, diamond: 0.16, ruby: 0.04, emerald: 0.04 }
  },
  crystal: {
    id: 'crystal', name: 'Crystal Cavern', levelRequired: 3, cost: 500, tier: 2, valueMult: 1.6, oreChance: 0.76,
    size: { w: 2600, h: 1700 }, theme: 'crystal', accent: '#38bdf8',
    weights: { coal: 55, copper: 75, iron: 48, gold: 11, sapphire: 3.4, diamond: 1.5, ruby: 0.45, emerald: 0.4 }
  },
  ember: {
    id: 'ember', name: 'Ember Depths', levelRequired: 7, cost: 2200, tier: 3, valueMult: 2.4, oreChance: 0.76,
    size: { w: 2700, h: 1750 }, theme: 'ember', accent: '#fb923c',
    weights: { coal: 32, copper: 55, iron: 70, gold: 24, sapphire: 6, diamond: 3.2, ruby: 1.8, emerald: 1.2 }
  },
  frost: {
    id: 'frost', name: 'Frostbite Abyss', levelRequired: 12, cost: 7500, tier: 4, valueMult: 3.6, oreChance: 0.76,
    size: { w: 2800, h: 1800 }, theme: 'frost', accent: '#7dd3fc',
    weights: { coal: 16, copper: 34, iron: 62, gold: 34, sapphire: 13, diamond: 7, ruby: 3.6, emerald: 3.2 }
  },
  void: {
    id: 'void', name: 'Voidreach', levelRequired: 18, cost: 25000, tier: 5, valueMult: 5.5, oreChance: 0.76,
    size: { w: 2900, h: 1850 }, theme: 'void', accent: '#c084fc',
    weights: { coal: 8, copper: 18, iron: 46, gold: 48, sapphire: 26, diamond: 16, ruby: 9, emerald: 8 }
  }
};

const MINE_ORDER = ['mossy', 'crystal', 'ember', 'frost', 'void'];

const CONSUMABLES = {
  tonic: { id: 'tonic', name: 'Energy Tonic', price: 120, description: '+60% mining speed for 30 seconds.', durationSeconds: 30, color: '#22d3ee' },
  magnet: { id: 'magnet', name: 'Ore Magnet', price: 180, description: 'Automatically pulls nearby ore drops for 30 seconds.', durationSeconds: 30, color: '#a78bfa' },
  charm: { id: 'charm', name: 'Lucky Charm', price: 250, description: '+50% rare ore odds for 30 seconds.', durationSeconds: 30, color: '#fbbf24' }
};

const CONSUMABLE_ORDER = ['tonic', 'magnet', 'charm'];

const ERROR_STATUS = {
  unauthorized: 401,
  profile_missing: 409,
  invalid_payload: 400,
  invalid_input: 400,
  invalid_quantity: 400,
  unknown_player: 404,
  unknown_ore: 400,
  unknown_mine: 400,
  mine_locked: 403,
  invalid_value: 400,
  invalid_xp: 400,
  inventory_empty: 409,
  unknown_pickaxe: 400,
  level_too_low: 403,
  insufficient_coins: 409,
  unknown_consumable: 400,
  not_owned: 403,
  invalid_username: 400,
  invalid_password: 400,
  username_taken: 409,
  invalid_credentials: 401,
  already_connected: 409,
  room_full: 409,
  room_limit: 503,
  not_in_mine: 409,
  inventory_full: 409,
  mine_mismatch: 409,
  rate_limited: 429,
  server_error: 500
};

class GameError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'GameError';
    this.code = code;
    this.status = status || ERROR_STATUS[code] || 400;
  }
}

function clampInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function toInt(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback || 0;
  return Math.trunc(number);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function approach(value, target, delta) {
  if (value < target) return Math.min(value + delta, target);
  return Math.max(value - delta, target);
}

function angleDiff(a, b) {
  let difference = (a - b + Math.PI) % (Math.PI * 2);
  if (difference < 0) difference += Math.PI * 2;
  return Math.abs(difference - Math.PI);
}

function getPickaxe(id) {
  return PICKAXES[id] || PICKAXES.basic;
}

function oreUnitValue(oreId, mineId) {
  const ore = ORES[oreId];
  const mine = MINES[mineId];
  if (!ore || !mine) throw new GameError('invalid_payload');
  return Math.max(1, Math.round(ore.value * mine.valueMult));
}

function oreXp(oreId, mine) {
  const ore = ORES[oreId];
  if (!ore || !mine) throw new GameError('invalid_payload');
  return Math.max(1, Math.round(ore.xp * (1 + (mine.tier - 1) * 0.12)));
}

function buffActive(player, key) {
  return Boolean(player && player.buffs[key + 'Until'] > Date.now());
}

function inventoryKey(oreId, mineId) {
  return oreId + '|' + mineId;
}

function inventoryCount(player) {
  let total = 0;
  for (const item of player.inventory.values()) total += item.quantity;
  return total;
}

function inventoryValue(player) {
  let total = 0;
  for (const item of player.inventory.values()) total += item.quantity * item.unitValue;
  return total;
}

function syncWealth(player) {
  player.wealth = player.coins + inventoryValue(player);
}

function weightedPick(weights) {
  let total = 0;
  for (const key of Object.keys(weights)) total += Math.max(0, weights[key]);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const key of Object.keys(weights)) {
    roll -= Math.max(0, weights[key]);
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0] || null;
}

function chooseOreId(mine, player) {
  const weights = { ...mine.weights };
  const charm = buffActive(player, 'charm');
  if (charm) {
    for (const oreId of Object.keys(weights)) {
      if (ORES[oreId].rarityRank >= 2) weights[oreId] *= 1.55;
    }
  }
  return weightedPick(weights) || 'coal';
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function asGameError(error) {
  if (error instanceof GameError) return error;
  if (error && error.type === 'entity.parse.failed') return new GameError('invalid_payload', 400);
  if (error && error.type === 'entity.too.large') return new GameError('invalid_payload', 413);
  const raw = String(error && (error.message || error.error_description) || error || 'server_error')
    .split('\n')[0]
    .trim();
  if (ERROR_STATUS[raw]) return new GameError(raw, ERROR_STATUS[raw]);
  if (raw.includes('duplicate key value violates unique constraint')) {
    return new GameError('username_taken', 409);
  }
  console.error(JSON.stringify({
    level: 'error',
    message: 'unhandled_error',
    detail: raw,
    stack: error && error.stack
  }));
  return new GameError('server_error', 500);
}

function sendError(res, error) {
  const normalized = asGameError(error);
  res.status(normalized.status).json({ ok: false, error: normalized.code });
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function getUserFromToken(token) {
  if (!token || typeof token !== 'string') throw new GameError('unauthorized');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) throw new GameError('unauthorized');
  return data.user;
}

function extractBearerToken(header) {
  const value = String(header || '');
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function extractSocketToken(socket) {
  const auth = socket.handshake.auth || {};
  if (auth.token) return String(auth.token);
  return extractBearerToken(socket.handshake.headers && socket.handshake.headers.authorization);
}

function defaultStats() {
  return {
    oresMined: 0,
    depositsMined: 0,
    coinsEarned: 0,
    coinsSpent: 0,
    oresSold: 0,
    playTime: 0,
    rarestTier: -1,
    rarestOre: null,
    sessions: 0
  };
}

async function loadPlayerState(userId) {
  const [profileRes, statsRes, inventoryRes, pickaxesRes, minesRes, consumablesRes, achievementsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('player_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('inventory').select('ore_id,mine_id,quantity,unit_value').eq('user_id', userId),
    supabase.from('player_pickaxes').select('pickaxe_id').eq('user_id', userId),
    supabase.from('player_mines').select('mine_id').eq('user_id', userId),
    supabase.from('player_consumables').select('consumable_id,quantity').eq('user_id', userId),
    supabase.from('player_achievements').select('achievement_id').eq('user_id', userId)
  ]);

  for (const result of [profileRes, statsRes, inventoryRes, pickaxesRes, minesRes, consumablesRes, achievementsRes]) {
    if (result.error) throw result.error;
  }

  if (!profileRes.data) throw new GameError('profile_missing', 409);

  const profile = profileRes.data;
  const inventory = new Map();
  for (const row of inventoryRes.data || []) {
    const quantity = Math.max(0, toInt(row.quantity, 0));
    if (!quantity || !ORES[row.ore_id] || !MINES[row.mine_id]) continue;
    inventory.set(inventoryKey(row.ore_id, row.mine_id), {
      oreId: row.ore_id,
      mineId: row.mine_id,
      quantity,
      unitValue: Math.max(1, toInt(row.unit_value, 1))
    });
  }

  const pickaxes = new Set((pickaxesRes.data || []).map(row => row.pickaxe_id).filter(id => PICKAXES[id]));
  pickaxes.add('basic');

  const mines = new Set((minesRes.data || []).map(row => row.mine_id).filter(id => MINES[id]));
  mines.add('mossy');

  const consumables = new Map(CONSUMABLE_ORDER.map(id => [id, 0]));
  for (const row of consumablesRes.data || []) {
    if (CONSUMABLES[row.consumable_id]) consumables.set(row.consumable_id, Math.max(0, toInt(row.quantity, 0)));
  }

  const statsRow = statsRes.data || {};
  const stats = {
    oresMined: toInt(statsRow.ores_mined, 0),
    depositsMined: toInt(statsRow.deposits_mined, 0),
    coinsEarned: toInt(statsRow.coins_earned, 0),
    coinsSpent: toInt(statsRow.coins_spent, 0),
    oresSold: toInt(statsRow.ores_sold, 0),
    playTime: toInt(statsRow.play_time_seconds, 0),
    rarestTier: toInt(statsRow.rarest_tier, -1),
    rarestOre: statsRow.rarest_ore || null,
    sessions: toInt(statsRow.sessions, 0)
  };

  const currentMine = MINES[profile.current_mine] && mines.has(profile.current_mine) ? profile.current_mine : 'mossy';
  const mine = MINES[currentMine];
  const equippedPickaxe = PICKAXES[profile.equipped_pickaxe] && pickaxes.has(profile.equipped_pickaxe)
    ? profile.equipped_pickaxe
    : 'basic';

  const player = {
    id: profile.id,
    username: profile.username,
    level: Math.max(1, toInt(profile.level, 1)),
    xp: Math.max(0, toInt(profile.xp, 0)),
    coins: Math.max(0, toInt(profile.coins, 0)),
    wealth: Math.max(0, toInt(profile.wealth, 0)),
    currentMine,
    equippedPickaxe,
    inventory,
    pickaxes,
    mines,
    consumables,
    achievements: new Set((achievementsRes.data || []).map(row => row.achievement_id)),
    stats,
    roomId: null,
    socketId: null,
    sessionId: null,
    sessionStartedAt: 0,
    session: { ores: 0, deposits: 0, coins: 0 },
    position: { x: mine.size.w / 2, y: mine.size.h / 2 },
    velocity: { x: 0, y: 0 },
    angle: 0,
    moving: false,
    mining: false,
    targetId: null,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      aimX: mine.size.w / 2 + 1,
      aimY: mine.size.h / 2,
      mining: false,
      seq: 0
    },
    buffs: { tonicUntil: 0, magnetUntil: 0, charmUntil: 0 },
    actionQueue: Promise.resolve(),
    achievementTimer: null,
    pendingPickups: 0,
    rate: {},
    lastInputAt: Date.now()
  };

  syncWealth(player);
  return player;
}

async function refreshProfile(player) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username,level,xp,coins,wealth,current_mine,equipped_pickaxe')
    .eq('id', player.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  player.username = data.username;
  player.level = Math.max(1, toInt(data.level, player.level));
  player.xp = Math.max(0, toInt(data.xp, player.xp));
  player.coins = Math.max(0, toInt(data.coins, player.coins));
  player.wealth = Math.max(0, toInt(data.wealth, player.wealth));
  player.currentMine = MINES[data.current_mine] ? data.current_mine : player.currentMine;
  player.equippedPickaxe = PICKAXES[data.equipped_pickaxe] ? data.equipped_pickaxe : player.equippedPickaxe;
}

function publicPlayer(player) {
  syncWealth(player);
  return {
    id: player.id,
    username: player.username,
    level: player.level,
    xp: player.xp,
    coins: player.coins,
    wealth: player.wealth,
    currentMine: player.currentMine,
    equippedPickaxe: player.equippedPickaxe,
    roomId: player.roomId,
    inventory: Array.from(player.inventory.values())
      .filter(item => item.quantity > 0)
      .sort((a, b) => ORES[b.oreId].rarityRank - ORES[a.oreId].rarityRank || a.oreId.localeCompare(b.oreId))
      .map(item => ({ oreId: item.oreId, mineId: item.mineId, qty: item.quantity, value: item.unitValue })),
    pickaxes: PICKAXE_ORDER.filter(id => player.pickaxes.has(id)),
    minesUnlocked: MINE_ORDER.filter(id => player.mines.has(id)),
    consumables: Object.fromEntries(CONSUMABLE_ORDER.map(id => [id, player.consumables.get(id) || 0])),
    stats: { ...player.stats },
    achievements: Array.from(player.achievements),
    buffs: { ...player.buffs }
  };
}

function basicPlayer(player, room) {
  const target = room && player.targetId ? room.deposits.get(player.targetId) : null;
  return {
    id: player.id,
    username: player.username,
    level: player.level,
    x: Math.round(player.position.x),
    y: Math.round(player.position.y),
    angle: Number(player.angle.toFixed(3)),
    moving: player.moving,
    mining: player.mining,
    targetId: player.targetId,
    targetProgress: target ? Number(target.progress.toFixed(3)) : 0,
    equippedPickaxe: player.equippedPickaxe
  };
}

function getConfig() {
  return {
    inventoryCap: INVENTORY_CAP,
    worldMargin: WORLD_MARGIN,
    playerRadius: PLAYER_RADIUS,
    playerSpeed: PLAYER_MAX_SPEED,
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    ores: ORE_ORDER.map(id => ({ ...ORES[id] })),
    pickaxes: PICKAXE_ORDER.map(id => ({ ...PICKAXES[id] })),
    mines: MINE_ORDER.map(id => ({ ...MINES[id], weights: { ...MINES[id].weights }, size: { ...MINES[id].size } })),
    consumables: CONSUMABLE_ORDER.map(id => ({ ...CONSUMABLES[id] }))
  };
}

function enqueue(player, task) {
  const next = player.actionQueue.then(task, task);
  player.actionQueue = next.catch(() => {});
  return next;
}

function rateLimit(player, key, limit, windowMs) {
  const now = Date.now();
  const bucket = player.rate[key];
  if (!bucket || bucket.resetAt <= now) {
    player.rate[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

const app = express();
const server = http.createServer(app);
const allowedOrigin = CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 100000,
  pingInterval: 25000,
  pingTimeout: 20000
});

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json({ limit: '32kb' }));

const activePlayers = new Map();
const rooms = new Map();
let roomSequence = 0;
let shuttingDown = false;

async function requireAuth(req, res, next) {
  try {
    req.user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    next();
  } catch (error) {
    sendError(res, error);
  }
}

async function withPlayer(req, res, task) {
  try {
    const player = activePlayers.get(req.user.id) || await loadPlayerState(req.user.id);
    const result = await enqueue(player, () => task(player));
    if (activePlayers.has(player.id)) emitPlayerUpdate(player);
    res.json({ ok: true, ...(result || {}), player: publicPlayer(player) });
  } catch (error) {
    sendError(res, error);
  }
}

app.get('/health', (req, res) => {
  let connectedPlayers = 0;
  for (const room of rooms.values()) connectedPlayers += room.players.size;
  res.json({
    ok: true,
    status: shuttingDown ? 'shutting_down' : 'online',
    uptime: Math.floor(process.uptime()),
    environment: NODE_ENV,
    rooms: rooms.size,
    players: connectedPlayers,
    sockets: io.engine.clientsCount
  });
});

app.get('/api/config', (req, res) => {
  res.json({ ok: true, config: getConfig() });
});

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const AUTH_EMAIL_DOMAIN = 'orebound.game';
const authRateBuckets = new Map();

function authEmail(username) {
  return username.toLowerCase() + '@' + AUTH_EMAIL_DOMAIN;
}

function authRateLimit(req, res, next) {
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const bucket = authRateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    authRateBuckets.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    next();
    return;
  }
  if (bucket.count >= 30) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }
  bucket.count += 1;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of authRateBuckets) {
    if (bucket.resetAt <= now) authRateBuckets.delete(key);
  }
}, 60000).unref();

function sessionPayload(session) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    tokenType: session.token_type || 'bearer',
    user: session.user ? { id: session.user.id } : null
  };
}

async function passwordLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data || !data.session) throw new GameError('invalid_credentials', 401);
  return sessionPayload(data.session);
}

app.post('/api/auth/signup', authRateLimit, async (req, res) => {
  try {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERNAME_RE.test(username)) throw new GameError('invalid_username', 400);
    if (password.length < 8 || password.length > 128) throw new GameError('invalid_password', 400);

    const email = authEmail(username);
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    });
    if (createError) {
      const detail = String(createError.message || createError.error_description || '');
      if (/already|exists|duplicate|registered/i.test(detail)) throw new GameError('username_taken', 409);
      throw createError;
    }

    const session = await passwordLogin(email, password);
    res.json({ ok: true, ...session });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERNAME_RE.test(username)) throw new GameError('invalid_username', 400);
    if (!password) throw new GameError('invalid_credentials', 401);
    res.json({ ok: true, ...(await passwordLogin(authEmail(username), password)) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/auth/refresh', authRateLimit, async (req, res) => {
  try {
    const refreshToken = req.body && typeof req.body.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!refreshToken) throw new GameError('unauthorized', 401);
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data || !data.session) throw new GameError('unauthorized', 401);
    res.json({ ok: true, ...sessionPayload(data.session) });
  } catch (error) {
    sendError(res, error);
  }
});

const CLOUD_STAT_MAP = {
  oresMined: 'ores_mined',
  depositsMined: 'deposits_mined',
  coinsEarned: 'coins_earned',
  coinsSpent: 'coins_spent',
  oresSold: 'ores_sold',
  playTime: 'play_time_seconds',
  rarestTier: 'rarest_tier',
  rarestOre: 'rarest_ore',
  sessions: 'sessions'
};

let achievementIdCache = null;
async function validAchievementIds() {
  if (!achievementIdCache) {
    const { data, error } = await supabase.from('achievement_defs').select('id');
    if (error) throw error;
    achievementIdCache = new Set((data || []).map(row => row.id));
  }
  return achievementIdCache;
}

async function saveCloudState(userId, body) {
  const b = body && typeof body === 'object' ? body : {};
  const pickaxeIds = new Set(PICKAXE_ORDER);
  const mineIds = new Set(MINE_ORDER);
  const consumableIds = new Set(CONSUMABLE_ORDER);

  const username = typeof b.username === 'string' ? b.username.trim() : '';
  if (USERNAME_RE.test(username)) {
    const { data: prof, error: profError } = await supabase
      .from('profiles').select('username').eq('id', userId).maybeSingle();
    if (profError) throw profError;
    if (prof && prof.username !== username) {
      const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
      if (error) throw error;
    }
  }

  const level = clampInt(b.level, 1, 1, 10000);
  const xp = Math.max(0, Math.min(Math.floor(Number(b.xp) || 0), 1e15));
  const coins = Math.max(0, Math.min(Math.floor(Number(b.coins) || 0), 1e15));
  const equippedPickaxe = pickaxeIds.has(b.equippedPickaxe) ? b.equippedPickaxe : 'basic';

  const inventoryRows = [];
  const seenStacks = new Set();
  let invTotal = 0;
  for (const item of Array.isArray(b.inventory) ? b.inventory : []) {
    const oreId = String(item && item.oreId || '');
    const mineId = String(item && item.mineId || '');
    const quantity = Math.floor(Number(item && item.quantity) || 0);
    const unitValue = Math.floor(Number(item && item.unitValue) || 0);
    if (!ORES[oreId] || !MINES[mineId] || quantity < 1 || unitValue < 1) continue;
    const key = oreId + '|' + mineId;
    if (seenStacks.has(key)) continue;
    seenStacks.add(key);
    invTotal += quantity;
    if (invTotal > 200000) break;
    inventoryRows.push({
      user_id: userId,
      ore_id: oreId,
      mine_id: mineId,
      quantity: Math.min(quantity, 200000),
      unit_value: unitValue
    });
  }

  const pickaxes = Array.from(new Set(
    (Array.isArray(b.pickaxes) ? b.pickaxes : []).map(String).filter(id => pickaxeIds.has(id))
  ));
  if (!pickaxes.includes('basic')) pickaxes.unshift('basic');

  const mines = Array.from(new Set(
    (Array.isArray(b.minesUnlocked) ? b.minesUnlocked : []).map(String).filter(id => mineIds.has(id))
  ));
  if (!mines.includes('mossy')) mines.unshift('mossy');
  const currentMine = mines.includes(b.currentMine) ? b.currentMine : 'mossy';

  const consumableRows = [];
  for (const id of consumableIds) {
    const qty = Math.floor(Number(b.consumables && b.consumables[id]) || 0);
    if (qty > 0) consumableRows.push({ user_id: userId, consumable_id: id, quantity: Math.min(qty, 200000) });
  }

  const statsRow = { user_id: userId, updated_at: new Date().toISOString() };
  const rawStats = b.stats && typeof b.stats === 'object' ? b.stats : {};
  for (const [key, column] of Object.entries(CLOUD_STAT_MAP)) {
    if (key === 'rarestOre') {
      statsRow[column] = ORES[rawStats[key]] ? rawStats[key] : null;
    } else if (key === 'rarestTier') {
      statsRow[column] = clampInt(rawStats[key], -1, -1, 5);
    } else {
      statsRow[column] = Math.max(0, Math.min(Math.floor(Number(rawStats[key]) || 0), 1e15));
    }
  }

  const validAchievements = await validAchievementIds();
  const achievementRows = Array.from(new Set(
    (Array.isArray(b.achievements) ? b.achievements : []).map(String).filter(id => validAchievements.has(id))
  )).map(id => ({ user_id: userId, achievement_id: id }));

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      level,
      xp,
      coins,
      current_mine: currentMine,
      equipped_pickaxe: equippedPickaxe
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: invDeleteError } = await supabase.from('inventory').delete().eq('user_id', userId);
  if (invDeleteError) throw invDeleteError;
  if (inventoryRows.length) {
    const { error } = await supabase.from('inventory').insert(inventoryRows);
    if (error) throw error;
  }

  const { error: pickDeleteError } = await supabase.from('player_pickaxes').delete().eq('user_id', userId);
  if (pickDeleteError) throw pickDeleteError;
  const { error: pickInsertError } = await supabase
    .from('player_pickaxes')
    .insert(pickaxes.map(id => ({ user_id: userId, pickaxe_id: id })));
  if (pickInsertError) throw pickInsertError;

  const { error: mineDeleteError } = await supabase.from('player_mines').delete().eq('user_id', userId);
  if (mineDeleteError) throw mineDeleteError;
  const { error: mineInsertError } = await supabase
    .from('player_mines')
    .insert(mines.map(id => ({ user_id: userId, mine_id: id })));
  if (mineInsertError) throw mineInsertError;

  const { error: consDeleteError } = await supabase.from('player_consumables').delete().eq('user_id', userId);
  if (consDeleteError) throw consDeleteError;
  if (consumableRows.length) {
    const { error } = await supabase.from('player_consumables').insert(consumableRows);
    if (error) throw error;
  }

  const { error: statsError } = await supabase.from('player_stats').upsert(statsRow, { onConflict: 'user_id' });
  if (statsError) throw statsError;

  const { error: achDeleteError } = await supabase.from('player_achievements').delete().eq('user_id', userId);
  if (achDeleteError) throw achDeleteError;
  if (achievementRows.length) {
    const { error } = await supabase.from('player_achievements').insert(achievementRows);
    if (error) throw error;
  }

  return { saved: true };
}

app.post('/api/state', requireAuth, async (req, res) => {
  try {
    const result = await saveCloudState(req.user.id, req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const player = activePlayers.get(req.user.id) || await loadPlayerState(req.user.id);
    res.json({ ok: true, player: publicPlayer(player), config: getConfig() });
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/leaderboard', requireAuth, async (req, res) => {
  try {
    res.json({ ok: true, leaderboard: await getLeaderboard(req.query.limit) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/username', requireAuth, (req, res) => {
  withPlayer(req, res, player => setUsername(player, req.body && req.body.username));
});

app.post('/api/pickaxe/buy', requireAuth, (req, res) => {
  withPlayer(req, res, player => purchasePickaxe(player, req.body && req.body.pickaxeId));
});

app.post('/api/pickaxe/equip', requireAuth, (req, res) => {
  withPlayer(req, res, player => equipPickaxe(player, req.body && req.body.pickaxeId));
});

app.post('/api/mine/unlock', requireAuth, (req, res) => {
  withPlayer(req, res, player => unlockMine(player, req.body && req.body.mineId));
});

app.post('/api/mine/select', requireAuth, (req, res) => {
  withPlayer(req, res, player => selectMine(player, req.body && req.body.mineId));
});

app.post('/api/consumable/buy', requireAuth, (req, res) => {
  withPlayer(req, res, player => purchaseConsumable(player, req.body && req.body.consumableId));
});

app.post('/api/consumable/use', requireAuth, (req, res) => {
  withPlayer(req, res, player => useConsumable(player, req.body && req.body.consumableId));
});

app.post('/api/inventory/sell', requireAuth, (req, res) => {
  withPlayer(req, res, player => sellInventoryItem(
    player,
    req.body && req.body.oreId,
    req.body && req.body.mineId,
    req.body && req.body.quantity
  ));
});

app.post('/api/achievements/check', requireAuth, (req, res) => {
  withPlayer(req, res, async player => {
    const unlocked = await checkAchievements(player);
    return { unlocked };
  });
});

async function getLeaderboard(limit) {
  const max = clampInt(limit, 10, 1, 100);
  const { data, error } = await supabase
    .from('leaderboard')
    .select('rank,user_id,username,level,coins,wealth,updated_at')
    .order('rank', { ascending: true })
    .limit(max);
  if (error) throw error;
  return (data || []).map(row => ({
    rank: toInt(row.rank, 0),
    userId: row.user_id,
    username: row.username,
    level: toInt(row.level, 1),
    coins: toInt(row.coins, 0),
    wealth: toInt(row.wealth, 0),
    updatedAt: row.updated_at
  }));
}

function findRoomForMine(mineId) {
  let emptyRoom = null;
  for (const room of rooms.values()) {
    if (room.mine.id !== mineId) continue;
    if (!room.players.size && !emptyRoom) emptyRoom = room;
    if (room.players.size < MAX_PLAYERS_PER_ROOM) return room;
  }
  if (emptyRoom) return emptyRoom;
  if (rooms.size >= MAX_ROOMS) throw new GameError('room_limit', 503);
  return createRoom(MINES[mineId]);
}

function createRoom(mine) {
  roomSequence += 1;
  const room = {
    id: mine.id + '-' + roomSequence,
    mine,
    players: new Map(),
    deposits: new Map(),
    drops: new Map(),
    nextDeposit: 1,
    nextDrop: 1,
    createdAt: Date.now(),
    lastActive: Date.now(),
    lastSnapshotAt: 0,
    emptySince: Date.now()
  };
  rooms.set(room.id, room);
  const total = Math.round(56 * ((mine.size.w * mine.size.h) / (2400 * 1600)));
  for (let i = 0; i < total; i += 1) addDeposit(room, 200);
  return room;
}

function addDeposit(room, avoidSpawn) {
  const radius = randomRange(27, 43);
  const position = findOpenSpot(room, radius, avoidSpawn);
  const oreId = Math.random() < room.mine.oreChance ? chooseOreId(room.mine, null) : null;
  const deposit = {
    id: 'd' + room.nextDeposit,
    x: position.x,
    y: position.y,
    r: radius,
    oreId,
    active: true,
    progress: 0,
    respawnAt: 0
  };
  room.nextDeposit += 1;
  room.deposits.set(deposit.id, deposit);
  return deposit;
}

function findOpenSpot(room, radius, avoidSpawn) {
  const mine = room.mine;
  const margin = WORLD_MARGIN + 34;
  const spawnX = mine.size.w / 2;
  const spawnY = mine.size.h / 2;
  for (let attempt = 0; attempt < 70; attempt += 1) {
    const x = margin + Math.random() * (mine.size.w - margin * 2);
    const y = margin + Math.random() * (mine.size.h - margin * 2);
    if (dist(x, y, spawnX, spawnY) < avoidSpawn) continue;
    let ok = true;
    for (const deposit of room.deposits.values()) {
      if (deposit.active && dist(x, y, deposit.x, deposit.y) < radius + deposit.r + 18) {
        ok = false;
        break;
      }
    }
    if (ok) return { x, y };
  }
  return {
    x: margin + Math.random() * (mine.size.w - margin * 2),
    y: margin + Math.random() * (mine.size.h - margin * 2)
  };
}

function buildRoomSnapshot(room) {
  return {
    serverTime: Date.now(),
    roomId: room.id,
    mineId: room.mine.id,
    players: Array.from(room.players.values()).map(player => basicPlayer(player, room)),
    drops: Array.from(room.drops.values()).map(basicDrop)
  };
}

function basicDrop(drop) {
  return {
    id: drop.id,
    x: Math.round(drop.x),
    y: Math.round(drop.y),
    oreId: drop.oreId,
    value: drop.value,
    age: Math.round(drop.age)
  };
}

function emitPlayerUpdate(player) {
  if (!player.socketId) return;
  io.to('user:' + player.id).emit('player:update', { player: publicPlayer(player) });
}

async function joinMine(player, payload) {
  const mineId = String(payload && payload.mineId || '');
  const mine = MINES[mineId];
  if (!mine) throw new GameError('unknown_mine');
  if (!player.mines.has(mineId)) throw new GameError('mine_locked', 403);
  if (player.roomId) await leaveMine(player, 'switch');

  if (player.currentMine !== mineId) {
    await rpc('select_mine', { p_user: player.id, p_mine_id: mineId });
    player.currentMine = mineId;
  }

  const room = findRoomForMine(mineId);
  const sessionId = toInt(await rpc('start_mine_session', { p_user: player.id, p_mine_id: mineId }), 0);
  if (!sessionId) throw new GameError('server_error');

  player.roomId = room.id;
  player.sessionId = sessionId;
  player.sessionStartedAt = Date.now();
  player.session = { ores: 0, deposits: 0, coins: 0 };
  player.stats.sessions += 1;
  player.position = { x: mine.size.w / 2, y: mine.size.h / 2 };
  player.velocity = { x: 0, y: 0 };
  player.angle = 0;
  player.moving = false;
  player.mining = false;
  player.targetId = null;
  player.input = {
    up: false,
    down: false,
    left: false,
    right: false,
    aimX: mine.size.w / 2 + 1,
    aimY: mine.size.h / 2,
    mining: false,
    seq: 0
  };
  player.buffs = { tonicUntil: 0, magnetUntil: 0, charmUntil: 0 };
  player.lastInputAt = Date.now();

  room.players.set(player.id, player);
  room.emptySince = 0;
  room.lastActive = Date.now();

  const socket = io.sockets.sockets.get(player.socketId);
  if (socket) socket.join(room.id);

  io.to(room.id).emit('player:joined', { player: basicPlayer(player, room) });
  emitPlayerUpdate(player);

  return {
    roomId: room.id,
    mine: { ...mine, weights: { ...mine.weights }, size: { ...mine.size } },
    world: { width: mine.size.w, height: mine.size.h, margin: WORLD_MARGIN },
    selfId: player.id,
    deposits: Array.from(room.deposits.values()),
    drops: Array.from(room.drops.values()).map(basicDrop),
    players: Array.from(room.players.values()).map(player => basicPlayer(player, room))
  };
}

async function leaveMine(player, reason) {
  const roomId = player.roomId;
  const sessionId = player.sessionId;
  if (!roomId && !sessionId) return { left: false };

  const room = roomId ? rooms.get(roomId) : null;
  if (room) {
    room.players.delete(player.id);
    room.lastActive = Date.now();
    if (!room.players.size) room.emptySince = Date.now();
    io.to(room.id).emit('player:left', { id: player.id, reason });
  }

  const socket = io.sockets.sockets.get(player.socketId);
  if (socket && roomId) socket.leave(roomId);

  player.roomId = null;
  player.sessionId = null;
  player.mining = false;
  player.moving = false;
  player.velocity = { x: 0, y: 0 };

  if (sessionId) {
    const playSeconds = Math.max(0, Math.round((Date.now() - player.sessionStartedAt) / 1000));
    player.stats.playTime += playSeconds;
    try {
      await rpc('end_mine_session', {
        p_user: player.id,
        p_session: sessionId,
        p_ores: Math.max(0, player.session.ores),
        p_deposits: Math.max(0, player.session.deposits),
        p_coins: Math.max(0, player.session.coins),
        p_play_seconds: playSeconds
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'end_session_failed',
        userId: player.id,
        sessionId,
        detail: asGameError(error).code
      }));
    }
  }

  player.session = { ores: 0, deposits: 0, coins: 0 };
  player.sessionStartedAt = 0;
  emitPlayerUpdate(player);
  return { left: true };
}

function sanitizeInput(player, room, payload) {
  const input = player.input;
  input.up = Boolean(payload && payload.up);
  input.down = Boolean(payload && payload.down);
  input.left = Boolean(payload && payload.left);
  input.right = Boolean(payload && payload.right);
  input.mining = Boolean(payload && payload.mining);
  input.seq = Math.max(input.seq, toInt(payload && payload.seq, input.seq));
  const aimX = Number(payload && payload.aimX);
  const aimY = Number(payload && payload.aimY);
  if (Number.isFinite(aimX)) input.aimX = clamp(aimX, 0, room.mine.size.w);
  if (Number.isFinite(aimY)) input.aimY = clamp(aimY, 0, room.mine.size.h);
  return input;
}

function pushOut(player, x, y, radius) {
  const dx = player.position.x - x;
  const dy = player.position.y - y;
  const minimum = radius + PLAYER_RADIUS;
  const distance = Math.hypot(dx, dy);
  if (distance < minimum && distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;
    player.position.x = x + nx * minimum;
    player.position.y = y + ny * minimum;
    const dot = player.velocity.x * nx + player.velocity.y * ny;
    if (dot < 0) {
      player.velocity.x -= dot * nx;
      player.velocity.y -= dot * ny;
    }
  }
}

function updatePlayerMovement(player, room, dt, now) {
  if (now - player.lastInputAt > 3000) {
    player.input.up = false;
    player.input.down = false;
    player.input.left = false;
    player.input.right = false;
    player.input.mining = false;
  }

  const input = player.input;
  let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(ix, iy);
  if (length > 0) {
    ix /= length;
    iy /= length;
  }

  player.velocity.x += ix * PLAYER_ACCEL * dt;
  player.velocity.y += iy * PLAYER_ACCEL * dt;
  if (!ix) player.velocity.x = approach(player.velocity.x, 0, PLAYER_FRICTION * dt);
  if (!iy) player.velocity.y = approach(player.velocity.y, 0, PLAYER_FRICTION * dt);

  const speed = Math.hypot(player.velocity.x, player.velocity.y);
  if (speed > PLAYER_MAX_SPEED) {
    player.velocity.x = (player.velocity.x / speed) * PLAYER_MAX_SPEED;
    player.velocity.y = (player.velocity.y / speed) * PLAYER_MAX_SPEED;
  }

  player.position.x += player.velocity.x * dt;
  player.position.y += player.velocity.y * dt;
  const margin = WORLD_MARGIN + 30;
  player.position.x = clamp(player.position.x, margin, room.mine.size.w - margin);
  player.position.y = clamp(player.position.y, margin, room.mine.size.h - margin);

  for (const deposit of room.deposits.values()) {
    if (deposit.active) pushOut(player, deposit.x, deposit.y, deposit.r * 0.82);
  }
  player.position.x = clamp(player.position.x, margin, room.mine.size.w - margin);
  player.position.y = clamp(player.position.y, margin, room.mine.size.h - margin);

  player.angle = Math.atan2(input.aimY - player.position.y, input.aimX - player.position.x);
  player.moving = Math.hypot(player.velocity.x, player.velocity.y) > 18;
}

function findTarget(player, room) {
  let best = null;
  let bestScore = Infinity;
  for (const deposit of room.deposits.values()) {
    if (!deposit.active) continue;
    const distance = dist(player.position.x, player.position.y, deposit.x, deposit.y);
    if (distance > MINING_REACH + deposit.r * 0.5) continue;
    const angle = Math.atan2(deposit.y - player.position.y, deposit.x - player.position.x);
    const overAim = dist(player.input.aimX, player.input.aimY, deposit.x, deposit.y) < deposit.r + 26;
    if (!overAim && angleDiff(angle, player.angle) > 1) continue;
    const score = dist(player.input.aimX, player.input.aimY, deposit.x, deposit.y) + distance * 0.18;
    if (score < bestScore) {
      bestScore = score;
      best = deposit;
    }
  }
  return best;
}

function updatePlayerMining(player, room, dt, now) {
  if (!player.input.mining || now - player.lastInputAt > 2000) {
    player.mining = false;
    player.targetId = null;
    for (const deposit of room.deposits.values()) {
      if (deposit.active && deposit.progress > 0) {
        deposit.progress = Math.max(0, deposit.progress - dt * 1.6);
      }
    }
    return;
  }

  const target = findTarget(player, room);
  player.targetId = target ? target.id : null;
  if (!target) {
    player.mining = false;
    for (const deposit of room.deposits.values()) {
      if (deposit.active && deposit.progress > 0) {
        deposit.progress = Math.max(0, deposit.progress - dt * 1.6);
      }
    }
    return;
  }

  const ore = target.oreId ? ORES[target.oreId] : null;
  const baseDuration = ore ? ore.duration : 2.45;
  const pickaxe = getPickaxe(player.equippedPickaxe);
  const speed = pickaxe.speed * (buffActive(player, 'tonic') ? 1.6 : 1);
  target.progress += dt / (baseDuration / speed);
  player.mining = true;
  room.lastActive = now;

  if (target.progress >= 1) breakDeposit(player, room, target, now);
}

function breakDeposit(player, room, deposit, now) {
  deposit.active = false;
  deposit.progress = 0;
  deposit.respawnAt = now + randomRange(9000, 18000);
  player.mining = false;
  player.targetId = null;
  player.stats.depositsMined += 1;
  player.session.deposits += 1;
  room.lastActive = now;

  enqueue(player, async () => {
    const deposits = await rpc('record_deposit_break', { p_user: player.id });
    player.stats.depositsMined = Math.max(player.stats.depositsMined, toInt(deposits, player.stats.depositsMined));
    scheduleAchievements(player);
  }).catch(error => {
    console.error(JSON.stringify({
      level: 'error',
      message: 'record_deposit_failed',
      userId: player.id,
      detail: asGameError(error).code
    }));
  });

  const dropIds = [];
  if (deposit.oreId) {
    const ore = ORES[deposit.oreId];
    let count = 1;
    if (Math.random() < 0.16) count += 1;
    if (buffActive(player, 'charm') && Math.random() < 0.2) count += 1;
    count = Math.min(count, 6);
    for (let i = 0; i < count; i += 1) dropIds.push(spawnDrop(room, deposit, ore));
  }

  io.to(room.id).emit('deposit:broken', {
    id: deposit.id,
    by: player.id,
    oreId: deposit.oreId,
    respawnAt: deposit.respawnAt,
    drops: dropIds
  });
}

function spawnDrop(room, deposit, ore) {
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(25, 105);
  const drop = {
    id: 'o' + room.nextDrop,
    x: deposit.x + randomRange(-deposit.r * 0.3, deposit.r * 0.3),
    y: deposit.y + randomRange(-deposit.r * 0.3, deposit.r * 0.3),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    oreId: ore.id,
    value: oreUnitValue(ore.id, room.mine.id),
    age: 0,
    collecting: false,
    rewardId: randomUUID()
  };
  room.nextDrop += 1;
  room.drops.set(drop.id, drop);
  if (room.drops.size > DROP_CAP) {
    const oldest = room.drops.keys().next();
    if (!oldest.done) room.drops.delete(oldest.value);
  }
  return drop.id;
}

function updateDrops(room, dt, now) {
  const margin = WORLD_MARGIN + 20;
  for (const drop of Array.from(room.drops.values())) {
    drop.age += dt;
    drop.vx *= Math.pow(0.02, dt);
    drop.vy *= Math.pow(0.02, dt);
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    drop.x = clamp(drop.x, margin, room.mine.size.w - margin);
    drop.y = clamp(drop.y, margin, room.mine.size.h - margin);

    if (drop.age * 1000 > DROP_LIFETIME_MS) {
      room.drops.delete(drop.id);
      io.to(room.id).emit('drop:removed', { dropId: drop.id, reason: 'expired' });
      continue;
    }

    for (const player of room.players.values()) {
      if (!buffActive(player, 'magnet')) continue;
      const distance = dist(drop.x, drop.y, player.position.x, player.position.y);
      if (distance >= 270 || distance <= 1) continue;
      const pull = (1 - distance / 270) * 980 + 240;
      drop.x += ((player.position.x - drop.x) / distance) * pull * dt;
      drop.y += ((player.position.y - drop.y) / distance) * pull * dt;
      if (distance < 30) collectDrop(player, room, drop);
      break;
    }
  }
}

function updateRespawns(room, now) {
  for (const deposit of room.deposits.values()) {
    if (deposit.active || now < deposit.respawnAt) continue;
    const position = findOpenSpot(room, deposit.r, 160);
    deposit.x = position.x;
    deposit.y = position.y;
    deposit.oreId = Math.random() < room.mine.oreChance ? chooseOreId(room.mine, null) : null;
    deposit.progress = 0;
    deposit.respawnAt = 0;
    deposit.active = true;
    io.to(room.id).emit('deposit:respawn', {
      id: deposit.id,
      x: Math.round(deposit.x),
      y: Math.round(deposit.y),
      r: Math.round(deposit.r),
      oreId: deposit.oreId
    });
  }
}

function tickRoom(room, now) {
  if (!room.players.size) return;
  const dt = TICK_MS / 1000;
  for (const player of room.players.values()) {
    updatePlayerMovement(player, room, dt, now);
    updatePlayerMining(player, room, dt, now);
  }
  updateDrops(room, dt, now);
  updateRespawns(room, now);

  if (now - room.lastSnapshotAt >= SNAPSHOT_MS) {
    room.lastSnapshotAt = now;
    io.to(room.id).emit('room:snapshot', buildRoomSnapshot(room));
  }
}

function collectDrop(player, room, drop) {
  if (!drop || drop.collecting || !room.drops.has(drop.id)) return false;
  if (inventoryCount(player) + player.pendingPickups >= INVENTORY_CAP) {
    io.to('user:' + player.id).emit('inventory:full');
    return false;
  }

  drop.collecting = true;
  player.pendingPickups += 1;

  enqueue(player, async () => {
    try {
      const applied = await applyMiningReward(player, room, drop);
      room.drops.delete(drop.id);
      io.to(room.id).emit('drop:collected', {
        dropId: drop.id,
        by: player.id,
        oreId: drop.oreId,
        applied
      });
      if (applied) emitPlayerUpdate(player);
    } finally {
      player.pendingPickups = Math.max(0, player.pendingPickups - 1);
    }
  }).catch(error => {
    drop.collecting = false;
    console.error(JSON.stringify({
      level: 'error',
      message: 'collect_drop_failed',
      userId: player.id,
      dropId: drop.id,
      detail: asGameError(error).code
    }));
  });

  return true;
}

async function applyMiningReward(player, room, drop) {
  const ore = ORES[drop.oreId];
  if (!ore) throw new GameError('unknown_ore');
  const rewardId = drop.rewardId || randomUUID();
  const data = await rpc('apply_mining_reward', {
    p_reward_id: rewardId,
    p_user: player.id,
    p_ore_id: drop.oreId,
    p_mine_id: room.mine.id,
    p_quantity: 1,
    p_unit_value: oreUnitValue(drop.oreId, room.mine.id),
    p_xp: oreXp(drop.oreId, room.mine)
  });
  const row = firstRow(data);
  if (!row) throw new GameError('server_error');
  if (!row.applied) return false;

  player.coins = Math.max(0, toInt(row.coins, player.coins));
  player.xp = Math.max(0, toInt(row.xp, player.xp));
  player.level = Math.max(1, toInt(row.level, player.level));
  player.inventory.set(inventoryKey(drop.oreId, room.mine.id), {
    oreId: drop.oreId,
    mineId: room.mine.id,
    quantity: Math.max(1, toInt(row.quantity, 1)),
    unitValue: oreUnitValue(drop.oreId, room.mine.id)
  });
  player.stats.oresMined += 1;
  player.session.ores += 1;
  if (ore.rarityRank > player.stats.rarestTier) {
    player.stats.rarestTier = ore.rarityRank;
    player.stats.rarestOre = ore.id;
  }
  syncWealth(player);
  scheduleAchievements(player);
  return true;
}

async function pickupNearby(player) {
  const room = rooms.get(player.roomId);
  if (!room) throw new GameError('not_in_mine', 409);
  const drops = Array.from(room.drops.values())
    .map(drop => ({ drop, distance: dist(player.position.x, player.position.y, drop.x, drop.y) }))
    .filter(entry => entry.distance <= PICKUP_RADIUS)
    .sort((a, b) => a.distance - b.distance);

  let picked = 0;
  for (const entry of drops) {
    if (picked >= MAX_PICKUPS_PER_ACTION) break;
    if (inventoryCount(player) + player.pendingPickups >= INVENTORY_CAP) break;
    if (collectDrop(player, room, entry.drop)) picked += 1;
  }

  return { picked };
}

async function useConsumable(player, consumableId) {
  const item = CONSUMABLES[consumableId];
  if (!item) throw new GameError('unknown_consumable');
  const data = await rpc('consume_consumable', {
    p_user: player.id,
    p_consumable_id: consumableId
  });
  const row = firstRow(data);
  if (!row || !row.consumed) throw new GameError('not_owned', 403);
  const quantity = Math.max(0, toInt(row.quantity, 0));
  player.consumables.set(consumableId, quantity);
  const until = Date.now() + item.durationSeconds * 1000;
  player.buffs[consumableId + 'Until'] = until;
  return { consumableId, quantity, until };
}

async function sellInventoryItem(player, oreId, mineId, quantity) {
  if (!ORES[oreId] || !MINES[mineId]) throw new GameError('invalid_payload');
  const amount = toInt(quantity, 0);
  if (amount < 1) throw new GameError('invalid_quantity');
  const key = inventoryKey(oreId, mineId);
  const current = player.inventory.get(key);
  if (!current) throw new GameError('inventory_empty', 409);
  const data = await rpc('sell_inventory_item', {
    p_user: player.id,
    p_ore_id: oreId,
    p_mine_id: mineId,
    p_quantity: Math.min(amount, current.quantity)
  });
  const row = firstRow(data);
  if (!row) throw new GameError('server_error');

  const sold = Math.max(0, toInt(row.sold, 0));
  const total = Math.max(0, toInt(row.total, 0));
  player.coins = Math.max(0, toInt(row.coins, player.coins));
  player.stats.oresSold += sold;
  player.stats.coinsEarned += total;
  if (player.roomId) player.session.coins += total;

  const remaining = current.quantity - sold;
  if (remaining <= 0) player.inventory.delete(key);
  else current.quantity = remaining;

  syncWealth(player);
  scheduleAchievements(player);
  return { sold, total };
}

async function purchasePickaxe(player, pickaxeId) {
  const pickaxe = PICKAXES[pickaxeId];
  if (!pickaxe) throw new GameError('unknown_pickaxe');
  const data = await rpc('purchase_pickaxe', {
    p_user: player.id,
    p_pickaxe_id: pickaxeId
  });
  const row = firstRow(data);
  if (!row) throw new GameError('server_error');
  const purchased = Boolean(row.purchased);
  player.coins = Math.max(0, toInt(row.coins, player.coins));
  player.equippedPickaxe = PICKAXES[row.equipped_pickaxe] ? row.equipped_pickaxe : pickaxeId;
  player.pickaxes.add(pickaxeId);
  if (purchased) player.stats.coinsSpent += pickaxe.price;
  syncWealth(player);
  scheduleAchievements(player);
  return { purchased, pickaxeId };
}

async function unlockMine(player, mineId) {
  const mine = MINES[mineId];
  if (!mine) throw new GameError('unknown_mine');
  if (player.roomId) throw new GameError('mine_mismatch', 409);
  const data = await rpc('unlock_mine', {
    p_user: player.id,
    p_mine_id: mineId
  });
  const row = firstRow(data);
  if (!row) throw new GameError('server_error');
  const unlocked = Boolean(row.unlocked);
  player.coins = Math.max(0, toInt(row.coins, player.coins));
  player.currentMine = MINES[row.current_mine] ? row.current_mine : mineId;
  player.mines.add(mineId);
  if (unlocked) player.stats.coinsSpent += mine.cost;
  syncWealth(player);
  scheduleAchievements(player);
  return { unlocked, mineId };
}

async function purchaseConsumable(player, consumableId) {
  const item = CONSUMABLES[consumableId];
  if (!item) throw new GameError('unknown_consumable');
  const data = await rpc('purchase_consumable', {
    p_user: player.id,
    p_consumable_id: consumableId
  });
  const row = firstRow(data);
  if (!row) throw new GameError('server_error');
  player.coins = Math.max(0, toInt(row.coins, player.coins));
  player.consumables.set(consumableId, Math.max(0, toInt(row.quantity, 0)));
  player.stats.coinsSpent += item.price;
  syncWealth(player);
  scheduleAchievements(player);
  return { purchased: Boolean(row.purchased), consumableId, quantity: player.consumables.get(consumableId) };
}

async function equipPickaxe(player, pickaxeId) {
  if (!PICKAXES[pickaxeId]) throw new GameError('unknown_pickaxe');
  await rpc('equip_pickaxe', { p_user: player.id, p_pickaxe_id: pickaxeId });
  player.equippedPickaxe = pickaxeId;
  return { pickaxeId };
}

async function selectMine(player, mineId) {
  if (!MINES[mineId]) throw new GameError('unknown_mine');
  if (player.roomId) throw new GameError('mine_mismatch', 409);
  await rpc('select_mine', { p_user: player.id, p_mine_id: mineId });
  player.currentMine = mineId;
  return { mineId };
}

async function setUsername(player, username) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    throw new GameError('invalid_username');
  }
  const data = await rpc('set_username', { p_user: player.id, p_username: username });
  player.username = typeof data === 'string' ? data : username;
  return { username: player.username };
}

function scheduleAchievements(player) {
  if (player.achievementTimer) return;
  player.achievementTimer = setTimeout(() => {
    player.achievementTimer = null;
    enqueue(player, () => checkAchievements(player)).catch(error => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'achievement_check_failed',
        userId: player.id,
        detail: asGameError(error).code
      }));
    });
  }, 300);
}

async function checkAchievements(player) {
  const data = await rpc('evaluate_achievements', { p_user: player.id });
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (!rows.length) return [];
  let rewardTotal = 0;
  const unlocked = [];
  for (const row of rows) {
    const reward = Math.max(0, toInt(row.reward_coins, 0));
    rewardTotal += reward;
    if (row.achievement_id) player.achievements.add(row.achievement_id);
    unlocked.push({
      id: row.achievement_id,
      name: row.achievement_name,
      reward
    });
  }
  if (rewardTotal > 0) player.stats.coinsEarned += rewardTotal;
  await refreshProfile(player);
  syncWealth(player);
  if (player.socketId) {
    for (const achievement of unlocked) {
      io.to('user:' + player.id).emit('achievement:unlocked', achievement);
    }
    emitPlayerUpdate(player);
  }
  return unlocked;
}

async function refreshPlayerState(player) {
  const fresh = await loadPlayerState(player.id);
  player.username = fresh.username;
  player.level = fresh.level;
  player.xp = fresh.xp;
  player.coins = fresh.coins;
  player.wealth = fresh.wealth;
  player.currentMine = fresh.currentMine;
  player.equippedPickaxe = fresh.equippedPickaxe;
  player.inventory = fresh.inventory;
  player.pickaxes = fresh.pickaxes;
  player.mines = fresh.mines;
  player.consumables = fresh.consumables;
  player.achievements = fresh.achievements;
  player.stats = fresh.stats;
  syncWealth(player);
  return { refreshed: true };
}

async function handleDisconnect(player, socketId, reason) {
  if (player.socketId !== socketId) return;
  player.socketId = null;
  try {
    await enqueue(player, () => leaveMine(player, 'disconnect'));
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'disconnect_cleanup_failed',
      userId: player.id,
      reason,
      detail: asGameError(error).code
    }));
  } finally {
    if (activePlayers.get(player.id) === player) activePlayers.delete(player.id);
  }
}

function handleAck(ack, promise) {
  Promise.resolve(promise)
    .then(result => {
      if (typeof ack === 'function') ack({ ok: true, ...(result || {}) });
    })
    .catch(error => {
      if (typeof ack === 'function') ack({ ok: false, error: asGameError(error).code });
    });
}

io.use(async (socket, next) => {
  try {
    const user = await getUserFromToken(extractSocketToken(socket));
    const existing = activePlayers.get(user.id);
    if (existing) {
      const oldSocketId = existing.socketId;
      existing.socketId = null;
      const oldSocket = oldSocketId ? io.sockets.sockets.get(oldSocketId) : null;
      if (oldSocket) {
        oldSocket.emit('session:replaced');
        oldSocket.disconnect(true);
      }
      await enqueue(existing, () => leaveMine(existing, 'replaced')).catch(() => {});
      if (activePlayers.get(existing.id) === existing) activePlayers.delete(existing.id);
    }
    const player = await loadPlayerState(user.id);
    socket.data.user = user;
    socket.data.player = player;
    next();
  } catch (error) {
    const normalized = asGameError(error);
    const socketError = new Error(normalized.code);
    socketError.data = { code: normalized.code };
    next(socketError);
  }
});

io.on('connection', socket => {
  const player = socket.data.player;
  player.socketId = socket.id;
  activePlayers.set(player.id, player);
  socket.join('user:' + player.id);

  socket.emit('session:ready', {
    player: publicPlayer(player),
    config: getConfig()
  });

  socket.on('mine:join', (payload, ack) => {
    if (!rateLimit(player, 'join', 5, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => joinMine(player, payload)));
  });

  socket.on('mine:input', payload => {
    if (!player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    if (!rateLimit(player, 'input', 60, 1000)) return;
    sanitizeInput(player, room, payload);
    player.lastInputAt = Date.now();
  });

  socket.on('mine:pickup', (payload, ack) => {
    if (!rateLimit(player, 'pickup', 12, 1000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => pickupNearby(player)));
  });

  socket.on('mine:leave', (payload, ack) => {
    handleAck(ack, enqueue(player, () => leaveMine(player, 'client')));
  });

  socket.on('mine:use', (payload, ack) => {
    if (!rateLimit(player, 'use', 8, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => useConsumable(player, payload && payload.consumableId)));
  });

  socket.on('inventory:sell', (payload, ack) => {
    if (!rateLimit(player, 'sell', 20, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => sellInventoryItem(
      player,
      payload && payload.oreId,
      payload && payload.mineId,
      payload && payload.quantity
    )));
  });

  socket.on('pickaxe:buy', (payload, ack) => {
    if (!rateLimit(player, 'shop', 12, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => purchasePickaxe(player, payload && payload.pickaxeId)));
  });

  socket.on('pickaxe:equip', (payload, ack) => {
    handleAck(ack, enqueue(player, () => equipPickaxe(player, payload && payload.pickaxeId)));
  });

  socket.on('mine:unlock', (payload, ack) => {
    if (!rateLimit(player, 'shop', 12, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => unlockMine(player, payload && payload.mineId)));
  });

  socket.on('mine:select', (payload, ack) => {
    handleAck(ack, enqueue(player, () => selectMine(player, payload && payload.mineId)));
  });

  socket.on('consumable:buy', (payload, ack) => {
    if (!rateLimit(player, 'shop', 12, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => purchaseConsumable(player, payload && payload.consumableId)));
  });

  socket.on('player:username', (payload, ack) => {
    if (!rateLimit(player, 'username', 3, 30000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => setUsername(player, payload && payload.username)));
  });

  socket.on('achievements:check', (payload, ack) => {
    if (!rateLimit(player, 'achievements', 5, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, async () => ({ unlocked: await checkAchievements(player) })));
  });

  socket.on('state:refresh', (payload, ack) => {
    if (!rateLimit(player, 'refresh', 10, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, enqueue(player, () => refreshPlayerState(player)));
  });

  socket.on('leaderboard:get', (payload, ack) => {
    if (!rateLimit(player, 'leaderboard', 20, 10000)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'rate_limited' });
      return;
    }
    handleAck(ack, getLeaderboard(payload && payload.limit));
  });

  socket.on('disconnect', reason => {
    void handleDisconnect(player, socket.id, reason);
  });
});

setInterval(() => {
  if (shuttingDown) return;
  const now = Date.now();
  for (const room of Array.from(rooms.values())) {
    if (!room.players.size && room.emptySince && now - room.emptySince > ROOM_IDLE_MS) {
      rooms.delete(room.id);
      continue;
    }
    tickRoom(room, now);
  }
}, TICK_MS);

if (SERVE_STATIC) {
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  app.get('/multiplayer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer.html'));
  });
  app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    fallthrough: true,
    maxAge: '1h',
    etag: true
  }));
}

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'not_found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  sendError(res, error);
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: 'info', message: 'shutdown_started', signal }));
  const tasks = [];
  for (const player of activePlayers.values()) {
    tasks.push(enqueue(player, () => leaveMine(player, 'shutdown')).catch(() => {}));
  }
  await Promise.allSettled(tasks);
  io.close();
  await new Promise(resolve => {
    server.close(resolve);
    setTimeout(resolve, 8000).unref();
  });
  console.log(JSON.stringify({ level: 'info', message: 'shutdown_complete', signal }));
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('unhandledRejection', error => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'unhandled_rejection',
    detail: asGameError(error).code
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'orebound_server_started',
    port: PORT,
    environment: NODE_ENV,
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    maxRooms: MAX_ROOMS,
    staticFiles: SERVE_STATIC
  }));
});
