-- MegaScan: Initial database schema
-- Run this in the Supabase SQL editor

-- ============================================================
-- 1. tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS tokens (
  address      TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT 'Unknown',
  symbol       TEXT NOT NULL DEFAULT '???',
  decimals     INTEGER NOT NULL DEFAULT 18,
  total_supply TEXT NOT NULL DEFAULT '0',
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  has_mint_function BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- 2. pools
-- ============================================================
CREATE TABLE IF NOT EXISTS pools (
  address          TEXT PRIMARY KEY,
  token0           TEXT NOT NULL REFERENCES tokens(address),
  token1           TEXT NOT NULL REFERENCES tokens(address),
  fee              INTEGER NOT NULL DEFAULT 0,
  dex              TEXT NOT NULL DEFAULT 'kumbaya',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sqrt_price_x96   TEXT NOT NULL DEFAULT '0',
  tick             INTEGER NOT NULL DEFAULT 0,
  liquidity        TEXT NOT NULL DEFAULT '0',
  price_usd        DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_eth        DOUBLE PRECISION NOT NULL DEFAULT 0,
  liquidity_usd    DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_24h       DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_1h        DOUBLE PRECISION NOT NULL DEFAULT 0,
  txns_24h         INTEGER NOT NULL DEFAULT 0,
  txns_1h          INTEGER NOT NULL DEFAULT 0,
  price_change_5m  DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_change_1h  DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_change_6h  DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_change_24h DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. trades
-- ============================================================
CREATE TABLE IF NOT EXISTS trades (
  id            TEXT PRIMARY KEY,  -- txHash-logIndex
  pair_address  TEXT NOT NULL REFERENCES pools(address),
  tx_hash       TEXT NOT NULL,
  block_number  INTEGER NOT NULL DEFAULT 0,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  side          TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  price         DOUBLE PRECISION NOT NULL DEFAULT 0,
  amount_token  DOUBLE PRECISION NOT NULL DEFAULT 0,
  amount_eth    DOUBLE PRECISION NOT NULL DEFAULT 0,
  value_usd     DOUBLE PRECISION NOT NULL DEFAULT 0,
  maker         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_trades_pair_time
  ON trades (pair_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trades_whales
  ON trades (value_usd DESC, timestamp DESC)
  WHERE value_usd >= 10000;

-- ============================================================
-- 4. candles
-- ============================================================
CREATE TABLE IF NOT EXISTS candles (
  pool_address TEXT NOT NULL REFERENCES pools(address),
  timeframe    TEXT NOT NULL,
  time         BIGINT NOT NULL,  -- unix seconds
  open         DOUBLE PRECISION NOT NULL DEFAULT 0,
  high         DOUBLE PRECISION NOT NULL DEFAULT 0,
  low          DOUBLE PRECISION NOT NULL DEFAULT 0,
  close        DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume       DOUBLE PRECISION NOT NULL DEFAULT 0,
  txns         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pool_address, timeframe, time)
);

-- ============================================================
-- 5. price_history
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pool_address TEXT NOT NULL,
  timestamp    BIGINT NOT NULL,  -- ms epoch
  price        DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_price_history_pool_time
  ON price_history (pool_address, timestamp DESC);

-- ============================================================
-- 6. stats (singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS stats (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_pools        INTEGER NOT NULL DEFAULT 0,
  total_volume_24h   DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_txns_24h     INTEGER NOT NULL DEFAULT 0,
  last_indexed_block INTEGER NOT NULL DEFAULT 0,
  indexer_ready      BOOLEAN NOT NULL DEFAULT FALSE,
  indexer_started_at BIGINT NOT NULL DEFAULT 0,
  eth_price_usd      DOUBLE PRECISION NOT NULL DEFAULT 3000,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS disabled (public blockchain data, service_role key only)
-- ============================================================
ALTER TABLE tokens        DISABLE ROW LEVEL SECURITY;
ALTER TABLE pools         DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades        DISABLE ROW LEVEL SECURITY;
ALTER TABLE candles       DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE stats         DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Cleanup: pg_cron jobs (run in Supabase SQL editor separately
-- if pg_cron extension is enabled)
-- ============================================================
-- DELETE trades older than 48 hours:
-- SELECT cron.schedule('cleanup-old-trades', '0 * * * *',
--   $$DELETE FROM trades WHERE timestamp < now() - interval '48 hours'$$);
--
-- DELETE price_history older than 25 hours:
-- SELECT cron.schedule('cleanup-old-price-history', '0 * * * *',
--   $$DELETE FROM price_history WHERE timestamp < (EXTRACT(EPOCH FROM now()) * 1000 - 90000000)::BIGINT$$);
