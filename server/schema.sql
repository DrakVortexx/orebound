CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- PLAYERS
-- =========================

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    money BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE players ADD COLUMN password_hash VARCHAR(255);
    END IF;
END $$;

-- =========================
-- INVENTORY
-- =========================

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    player_id UUID NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    item_type VARCHAR(50) NOT NULL,

    item_id UUID,

    amount BIGINT NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (amount > 0)
);

-- =========================
-- PLOTS
-- =========================

CREATE TABLE IF NOT EXISTS plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    player_id UUID UNIQUE NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    size INTEGER NOT NULL DEFAULT 20,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (size > 0)
);

-- =========================
-- GENERATORS
-- =========================

CREATE TABLE IF NOT EXISTS generators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    generator_type VARCHAR(50) NOT NULL,

    income_per_second BIGINT NOT NULL DEFAULT 0,

    x DOUBLE PRECISION NOT NULL DEFAULT 0,
    y DOUBLE PRECISION NOT NULL DEFAULT 0,
    z DOUBLE PRECISION NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (income_per_second >= 0)
);

-- =========================
-- CRATES
-- =========================

CREATE TABLE IF NOT EXISTS crates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    crate_type VARCHAR(50) NOT NULL,

    unlock_at TIMESTAMPTZ NOT NULL,

    opened BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- TRADES
-- =========================

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_id UUID NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    receiver_id UUID NOT NULL
        REFERENCES players(id) ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (sender_id != receiver_id)
);

-- =========================
-- INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS inventory_player_idx
ON inventory(player_id);

CREATE INDEX IF NOT EXISTS players_money_idx
ON players(money DESC);

CREATE INDEX IF NOT EXISTS generators_owner_idx
ON generators(owner_id);

CREATE INDEX IF NOT EXISTS crates_owner_idx
ON crates(owner_id);

CREATE INDEX IF NOT EXISTS trades_sender_idx
ON trades(sender_id);

CREATE INDEX IF NOT EXISTS trades_receiver_idx
ON trades(receiver_id);