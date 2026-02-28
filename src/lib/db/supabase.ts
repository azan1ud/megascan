/**
 * Supabase database layer for MegaScan.
 *
 * Read functions  → used by Vercel API routes
 * Write functions → used by the standalone indexer's sync layer
 */

import { createClient } from '@supabase/supabase-js';
import type { PoolData, TokenData, TradeData, CandleData } from '@/lib/store/dataStore';
import type { DexId } from '@/config/chain';

// ---- Client (lazy to avoid build-time crashes when env vars are not set) ----

import type { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ---- Converters ----

function rowToPool(row: Record<string, unknown>): PoolData {
  return {
    address: row.address as string,
    token0: row.token0 as string,
    token1: row.token1 as string,
    fee: row.fee as number,
    dex: row.dex as DexId,
    createdAt: row.created_at as string,
    sqrtPriceX96: BigInt((row.sqrt_price_x96 as string) || '0'),
    tick: row.tick as number,
    liquidity: BigInt((row.liquidity as string) || '0'),
    priceUsd: row.price_usd as number,
    priceEth: row.price_eth as number,
    liquidityUsd: row.liquidity_usd as number,
    volume24h: row.volume_24h as number,
    volume1h: row.volume_1h as number,
    txns24h: row.txns_24h as number,
    txns1h: row.txns_1h as number,
    priceChange5m: row.price_change_5m as number,
    priceChange1h: row.price_change_1h as number,
    priceChange6h: row.price_change_6h as number,
    priceChange24h: row.price_change_24h as number,
    updatedAt: row.updated_at as string,
  };
}

function poolToRow(pool: PoolData): Record<string, unknown> {
  return {
    address: pool.address,
    token0: pool.token0,
    token1: pool.token1,
    fee: pool.fee,
    dex: pool.dex,
    created_at: pool.createdAt,
    sqrt_price_x96: pool.sqrtPriceX96.toString(),
    tick: pool.tick,
    liquidity: pool.liquidity.toString(),
    price_usd: pool.priceUsd,
    price_eth: pool.priceEth,
    liquidity_usd: pool.liquidityUsd,
    volume_24h: pool.volume24h,
    volume_1h: pool.volume1h,
    txns_24h: pool.txns24h,
    txns_1h: pool.txns1h,
    price_change_5m: pool.priceChange5m,
    price_change_1h: pool.priceChange1h,
    price_change_6h: pool.priceChange6h,
    price_change_24h: pool.priceChange24h,
    updated_at: pool.updatedAt,
  };
}

function rowToToken(row: Record<string, unknown>): TokenData {
  return {
    address: row.address as string,
    name: row.name as string,
    symbol: row.symbol as string,
    decimals: row.decimals as number,
    totalSupply: row.total_supply as string,
    isVerified: row.is_verified as boolean,
    hasMintFunction: row.has_mint_function as boolean,
  };
}

function tokenToRow(token: TokenData): Record<string, unknown> {
  return {
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    total_supply: token.totalSupply,
    is_verified: token.isVerified,
    has_mint_function: token.hasMintFunction,
  };
}

function rowToTrade(row: Record<string, unknown>): TradeData {
  return {
    id: row.id as string,
    pairAddress: row.pair_address as string,
    txHash: row.tx_hash as string,
    blockNumber: row.block_number as number,
    timestamp: row.timestamp as string,
    side: row.side as 'buy' | 'sell',
    price: row.price as number,
    amountToken: row.amount_token as number,
    amountEth: row.amount_eth as number,
    valueUsd: row.value_usd as number,
    maker: row.maker as string,
  };
}

function tradeToRow(trade: TradeData): Record<string, unknown> {
  return {
    id: trade.id,
    pair_address: trade.pairAddress,
    tx_hash: trade.txHash,
    block_number: trade.blockNumber,
    timestamp: trade.timestamp,
    side: trade.side,
    price: trade.price,
    amount_token: trade.amountToken,
    amount_eth: trade.amountEth,
    value_usd: trade.valueUsd,
    maker: trade.maker,
  };
}

function rowToCandle(row: Record<string, unknown>): CandleData {
  return {
    time: row.time as number,
    open: row.open as number,
    high: row.high as number,
    low: row.low as number,
    close: row.close as number,
    volume: row.volume as number,
    txns: row.txns as number,
  };
}

function candleToRow(candle: CandleData, poolAddress: string, timeframe: string): Record<string, unknown> {
  return {
    pool_address: poolAddress,
    timeframe,
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    txns: candle.txns,
  };
}

// ============================================================
// READ functions (for Vercel API routes)
// ============================================================

export async function dbGetAllPools(
  sortBy = 'volume_24h',
  sortDir: 'asc' | 'desc' = 'desc',
  dex = 'all'
): Promise<PoolData[]> {
  let query = getSupabase().from('pools').select('*');
  if (dex !== 'all') {
    query = query.eq('dex', dex);
  }
  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToPool);
}

export async function dbGetPool(address: string): Promise<PoolData | null> {
  const { data, error } = await getSupabase()
    .from('pools')
    .select('*')
    .eq('address', address.toLowerCase())
    .single();

  if (error || !data) return null;
  return rowToPool(data);
}

export async function dbGetTokensMap(addresses: string[]): Promise<Map<string, TokenData>> {
  const map = new Map<string, TokenData>();
  if (addresses.length === 0) return map;

  const { data, error } = await getSupabase()
    .from('tokens')
    .select('*')
    .in('address', addresses);

  if (error || !data) return map;
  for (const row of data) {
    const token = rowToToken(row);
    map.set(token.address, token);
  }
  return map;
}

export async function dbGetToken(address: string): Promise<TokenData | null> {
  const { data, error } = await getSupabase()
    .from('tokens')
    .select('*')
    .eq('address', address.toLowerCase())
    .single();

  if (error || !data) return null;
  return rowToToken(data);
}

export async function dbGetAllTokens(search?: string): Promise<TokenData[]> {
  let query = getSupabase().from('tokens').select('*');

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query = query.or(`name.ilike.${term},symbol.ilike.${term},address.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToToken);
}

export async function dbGetTradesForPool(pairAddress: string, limit = 50): Promise<TradeData[]> {
  const { data, error } = await getSupabase()
    .from('trades')
    .select('*')
    .eq('pair_address', pairAddress.toLowerCase())
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(rowToTrade);
}

export async function dbGetCandlesForPool(
  poolAddress: string,
  timeframe: string,
  limit = 200
): Promise<CandleData[]> {
  const { data, error } = await getSupabase()
    .from('candles')
    .select('*')
    .eq('pool_address', poolAddress.toLowerCase())
    .eq('timeframe', timeframe)
    .order('time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(rowToCandle);
}

export async function dbGetWhaleTrades(limit = 50): Promise<TradeData[]> {
  const { data, error } = await getSupabase()
    .from('trades')
    .select('*')
    .gte('value_usd', 10000)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(rowToTrade);
}

export async function dbGetStats(): Promise<{
  totalPools: number;
  totalVolume24h: number;
  totalTxns24h: number;
  lastIndexedBlock: number;
  indexerReady: boolean;
  indexerStartedAt: number;
  ethPriceUsd: number;
} | null> {
  const { data, error } = await getSupabase()
    .from('stats')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return null;
  return {
    totalPools: data.total_pools,
    totalVolume24h: data.total_volume_24h,
    totalTxns24h: data.total_txns_24h,
    lastIndexedBlock: data.last_indexed_block,
    indexerReady: data.indexer_ready,
    indexerStartedAt: data.indexer_started_at,
    ethPriceUsd: data.eth_price_usd,
  };
}

// ============================================================
// WRITE functions (for standalone indexer sync layer)
// ============================================================

const BATCH_SIZE = 500;

export async function dbUpsertTokens(tokens: TokenData[]): Promise<void> {
  const rows = tokens.map(tokenToRow);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabase()
      .from('tokens')
      .upsert(batch, { onConflict: 'address' });
    if (error) console.error('[DB] upsert tokens error:', error.message);
  }
}

export async function dbUpsertPools(pools: PoolData[]): Promise<void> {
  const rows = pools.map(poolToRow);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabase()
      .from('pools')
      .upsert(batch, { onConflict: 'address' });
    if (error) console.error('[DB] upsert pools error:', error.message);
  }
}

export async function dbInsertTrades(trades: TradeData[]): Promise<void> {
  if (trades.length === 0) return;
  const rows = trades.map(tradeToRow);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabase()
      .from('trades')
      .upsert(batch, { onConflict: 'id' });
    if (error) console.error('[DB] insert trades error:', error.message);
  }
}

export async function dbUpsertCandles(
  candles: { poolAddress: string; timeframe: string; candle: CandleData }[]
): Promise<void> {
  if (candles.length === 0) return;
  // Deduplicate: keep last entry per (pool_address, timeframe, time) to avoid
  // "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const deduped = new Map<string, Record<string, unknown>>();
  for (const c of candles) {
    const row = candleToRow(c.candle, c.poolAddress, c.timeframe);
    const key = `${c.poolAddress}|${c.timeframe}|${c.candle.time}`;
    deduped.set(key, row);
  }
  const rows = Array.from(deduped.values());
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabase()
      .from('candles')
      .upsert(batch, { onConflict: 'pool_address,timeframe,time' });
    if (error) console.error('[DB] upsert candles error:', error.message);
  }
}

export async function dbInsertPriceHistory(
  points: { poolAddress: string; timestamp: number; price: number }[]
): Promise<void> {
  if (points.length === 0) return;
  const rows = points.map((p) => ({
    pool_address: p.poolAddress,
    timestamp: p.timestamp,
    price: p.price,
  }));
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await getSupabase().from('price_history').insert(batch);
    if (error) console.error('[DB] insert price_history error:', error.message);
  }
}

export async function dbUpdateStats(stats: {
  totalPools: number;
  totalVolume24h: number;
  totalTxns24h: number;
  lastIndexedBlock: number;
  indexerReady: boolean;
  indexerStartedAt: number;
  ethPriceUsd: number;
}): Promise<void> {
  const { error } = await getSupabase()
    .from('stats')
    .upsert({
      id: 1,
      total_pools: stats.totalPools,
      total_volume_24h: stats.totalVolume24h,
      total_txns_24h: stats.totalTxns24h,
      last_indexed_block: stats.lastIndexedBlock,
      indexer_ready: stats.indexerReady,
      indexer_started_at: stats.indexerStartedAt,
      eth_price_usd: stats.ethPriceUsd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.error('[DB] update stats error:', error.message);
}
