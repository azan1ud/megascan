/**
 * Sync layer: flushes in-memory DataStore to Supabase.
 *
 * The indexer runs entirely in-memory (dataStore + poolIndexer unchanged).
 * This module periodically reads from the in-memory store and upserts
 * everything into Supabase so the Vercel-hosted API can read from it.
 */

import { dataStore } from '@/lib/store/dataStore';
import type { TradeData, CandleData } from '@/lib/store/dataStore';
import {
  dbUpsertTokens,
  dbUpsertPools,
  dbInsertTrades,
  dbUpsertCandles,
  dbInsertPriceHistory,
  dbUpdateStats,
} from '@/lib/db/supabase';

// Delta tracking: trade IDs we've already synced
const syncedTradeIds = new Set<string>();

// Delta tracking: last synced price history length per pool
const lastPriceHistoryLen = new Map<string, number>();

function log(msg: string) {
  console.log(`[Sync] ${msg}`);
}

/**
 * Full sync — pushes all in-memory data to Supabase.
 * Called once after initial indexer startup.
 */
export async function syncAllToSupabase(): Promise<void> {
  const t0 = Date.now();
  log('Starting full sync to Supabase...');

  try {
    // 1. Tokens (must be upserted before pools due to FK)
    const tokens = dataStore.getAllTokens();
    await dbUpsertTokens(tokens);
    log(`  Synced ${tokens.length} tokens`);

    // 2. Pools
    const pools = dataStore.getAllPools();
    await dbUpsertPools(pools);
    log(`  Synced ${pools.length} pools`);

    // 3. Trades — collect from all pools
    const allTrades: TradeData[] = [];
    for (const [, trades] of dataStore.trades) {
      for (const trade of trades) {
        allTrades.push(trade);
        syncedTradeIds.add(trade.id);
      }
    }
    await dbInsertTrades(allTrades);
    log(`  Synced ${allTrades.length} trades`);

    // 4. Candles — all timeframes for all pools
    const candleRows: { poolAddress: string; timeframe: string; candle: CandleData }[] = [];
    for (const [poolAddr, tfMap] of dataStore.candles) {
      for (const [tf, candles] of tfMap) {
        for (const candle of candles) {
          candleRows.push({ poolAddress: poolAddr, timeframe: tf, candle });
        }
      }
    }
    await dbUpsertCandles(candleRows);
    log(`  Synced ${candleRows.length} candle rows`);

    // 5. Price history
    const priceRows: { poolAddress: string; timestamp: number; price: number }[] = [];
    for (const [poolAddr, points] of dataStore.priceHistory) {
      for (const point of points) {
        priceRows.push({ poolAddress: poolAddr, timestamp: point.timestamp, price: point.price });
      }
      lastPriceHistoryLen.set(poolAddr, points.length);
    }
    await dbInsertPriceHistory(priceRows);
    log(`  Synced ${priceRows.length} price history points`);

    // 6. Stats
    await dbUpdateStats({
      totalPools: dataStore.stats.totalPools,
      totalVolume24h: dataStore.stats.totalVolume24h,
      totalTxns24h: dataStore.stats.totalTxns24h,
      lastIndexedBlock: dataStore.stats.lastIndexedBlock,
      indexerReady: dataStore.stats.indexerReady,
      indexerStartedAt: dataStore.stats.indexerStartedAt,
      ethPriceUsd: dataStore.ethPriceUsd,
    });
    log(`  Synced stats`);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log(`Full sync complete in ${elapsed}s`);
  } catch (e) {
    log(`Full sync error: ${e}`);
  }
}

/**
 * Delta sync — only pushes changes since last sync.
 * Called every 15s after the initial full sync.
 */
export async function syncDeltaToSupabase(): Promise<void> {
  const t0 = Date.now();

  try {
    // 1. Tokens (cheap upsert, always send all — fast enough at ~5k tokens)
    const tokens = dataStore.getAllTokens();
    await dbUpsertTokens(tokens);

    // 2. Pools (always upsert all — prices/volumes change constantly)
    const pools = dataStore.getAllPools();
    await dbUpsertPools(pools);

    // 3. New trades only (delta)
    const newTrades: TradeData[] = [];
    for (const [, trades] of dataStore.trades) {
      for (const trade of trades) {
        if (!syncedTradeIds.has(trade.id)) {
          newTrades.push(trade);
          syncedTradeIds.add(trade.id);
        }
      }
    }
    if (newTrades.length > 0) {
      await dbInsertTrades(newTrades);
    }

    // 4. Candles — only upsert the last 3 candles per timeframe (recent ones that may have updated)
    const candleRows: { poolAddress: string; timeframe: string; candle: CandleData }[] = [];
    for (const [poolAddr, tfMap] of dataStore.candles) {
      for (const [tf, candles] of tfMap) {
        // Last 3 candles might have been updated
        const recentCandles = candles.slice(-3);
        for (const candle of recentCandles) {
          candleRows.push({ poolAddress: poolAddr, timeframe: tf, candle });
        }
      }
    }
    if (candleRows.length > 0) {
      await dbUpsertCandles(candleRows);
    }

    // 5. New price history points (delta)
    const priceRows: { poolAddress: string; timestamp: number; price: number }[] = [];
    for (const [poolAddr, points] of dataStore.priceHistory) {
      const lastLen = lastPriceHistoryLen.get(poolAddr) || 0;
      if (points.length > lastLen) {
        const newPoints = points.slice(lastLen);
        for (const point of newPoints) {
          priceRows.push({ poolAddress: poolAddr, timestamp: point.timestamp, price: point.price });
        }
      }
      lastPriceHistoryLen.set(poolAddr, points.length);
    }
    if (priceRows.length > 0) {
      await dbInsertPriceHistory(priceRows);
    }

    // 6. Stats
    await dbUpdateStats({
      totalPools: dataStore.stats.totalPools,
      totalVolume24h: dataStore.stats.totalVolume24h,
      totalTxns24h: dataStore.stats.totalTxns24h,
      lastIndexedBlock: dataStore.stats.lastIndexedBlock,
      indexerReady: dataStore.stats.indexerReady,
      indexerStartedAt: dataStore.stats.indexerStartedAt,
      ethPriceUsd: dataStore.ethPriceUsd,
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log(`Delta sync: ${newTrades.length} new trades, ${priceRows.length} new price points (${elapsed}s)`);

    // Prevent memory leak: prune old synced trade IDs that are no longer in-memory
    if (syncedTradeIds.size > 100_000) {
      const currentIds = new Set<string>();
      for (const [, trades] of dataStore.trades) {
        for (const trade of trades) {
          currentIds.add(trade.id);
        }
      }
      for (const id of syncedTradeIds) {
        if (!currentIds.has(id)) syncedTradeIds.delete(id);
      }
    }
  } catch (e) {
    log(`Delta sync error: ${e}`);
  }
}
