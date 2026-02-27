/**
 * In-memory data store for indexed on-chain data.
 * Singleton that persists within the Node.js process.
 * Data resets on server restart; re-indexes in ~30s.
 */

import type { DexId } from '@/config/chain';

// ---- Internal types ----

export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  dex: DexId;
  createdAt: string;
  // State from slot0/liquidity
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  // Computed
  priceUsd: number;
  priceEth: number;
  liquidityUsd: number;
  volume24h: number;
  volume1h: number;
  txns24h: number;
  txns1h: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  updatedAt: string;
}

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  isVerified: boolean;
  hasMintFunction: boolean;
}

export interface TradeData {
  id: string;
  pairAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  side: 'buy' | 'sell';
  price: number;
  amountToken: number;
  amountEth: number;
  valueUsd: number;
  maker: string;
}

export interface CandleData {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  txns: number;
}

export interface PricePoint {
  timestamp: number; // ms
  price: number;
}

// ---- Bounds ----
const MAX_TRADES_PER_POOL = 500;
const MAX_CANDLES_PER_TIMEFRAME = 500;
const MAX_PRICE_HISTORY_MS = 25 * 60 * 60 * 1000; // 25 hours

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

class DataStore {
  pools = new Map<string, PoolData>(); // poolAddress → PoolData
  tokens = new Map<string, TokenData>(); // tokenAddress → TokenData
  trades = new Map<string, TradeData[]>(); // poolAddress → trades[]
  candles = new Map<string, Map<Timeframe, CandleData[]>>(); // poolAddress → timeframe → candles[]
  priceHistory = new Map<string, PricePoint[]>(); // poolAddress → price points

  stats = {
    totalPools: 0,
    totalVolume24h: 0,
    totalTxns24h: 0,
    lastIndexedBlock: 0,
    indexerReady: false,
    indexerStartedAt: 0,
  };

  ethPriceUsd = 3000; // updated periodically

  // ---- Pool methods ----

  addPool(pool: PoolData) {
    this.pools.set(pool.address.toLowerCase(), pool);
    this.stats.totalPools = this.pools.size;
  }

  getPool(address: string): PoolData | undefined {
    return this.pools.get(address.toLowerCase());
  }

  getAllPools(): PoolData[] {
    return Array.from(this.pools.values());
  }

  // ---- Token methods ----

  addToken(token: TokenData) {
    this.tokens.set(token.address.toLowerCase(), token);
  }

  getToken(address: string): TokenData | undefined {
    return this.tokens.get(address.toLowerCase());
  }

  getAllTokens(): TokenData[] {
    return Array.from(this.tokens.values());
  }

  // ---- Trade methods ----

  addTrade(trade: TradeData) {
    const key = trade.pairAddress.toLowerCase();
    if (!this.trades.has(key)) {
      this.trades.set(key, []);
    }
    const arr = this.trades.get(key)!;
    arr.unshift(trade); // newest first
    if (arr.length > MAX_TRADES_PER_POOL) {
      arr.length = MAX_TRADES_PER_POOL;
    }

    // Update candle
    this.updateCandle(trade);

    // Update price history
    this.addPricePoint(key, { timestamp: Date.parse(trade.timestamp), price: trade.price });
  }

  getTradesForPool(address: string, limit = 50): TradeData[] {
    const arr = this.trades.get(address.toLowerCase());
    if (!arr) return [];
    return arr.slice(0, limit);
  }

  // ---- Candle methods ----

  updateCandle(trade: TradeData) {
    const key = trade.pairAddress.toLowerCase();
    if (!this.candles.has(key)) {
      this.candles.set(key, new Map());
    }
    const poolCandles = this.candles.get(key)!;

    for (const tf of Object.keys(TIMEFRAME_MS) as Timeframe[]) {
      if (!poolCandles.has(tf)) {
        poolCandles.set(tf, []);
      }
      const arr = poolCandles.get(tf)!;
      const intervalMs = TIMEFRAME_MS[tf];
      const tradeTime = Date.parse(trade.timestamp);
      const candleTime = Math.floor(tradeTime / intervalMs) * Math.floor(intervalMs / 1000);

      const last = arr.length > 0 ? arr[arr.length - 1] : null;

      if (last && last.time === candleTime) {
        // Update existing candle
        last.high = Math.max(last.high, trade.price);
        last.low = Math.min(last.low, trade.price);
        last.close = trade.price;
        last.volume += trade.valueUsd;
        last.txns += 1;
      } else {
        // New candle
        arr.push({
          time: candleTime,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.valueUsd,
          txns: 1,
        });
        if (arr.length > MAX_CANDLES_PER_TIMEFRAME) {
          arr.shift();
        }
      }
    }
  }

  getCandlesForPool(address: string, timeframe: Timeframe, limit = 200): CandleData[] {
    const poolCandles = this.candles.get(address.toLowerCase());
    if (!poolCandles) return [];
    const arr = poolCandles.get(timeframe);
    if (!arr) return [];
    return arr.slice(-limit);
  }

  // ---- Price history methods ----

  addPricePoint(poolAddress: string, point: PricePoint) {
    const key = poolAddress.toLowerCase();
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    const arr = this.priceHistory.get(key)!;
    arr.push(point);

    // Prune old entries
    const cutoff = Date.now() - MAX_PRICE_HISTORY_MS;
    while (arr.length > 0 && arr[0].timestamp < cutoff) {
      arr.shift();
    }
  }

  // ---- Stats computation ----

  computeRollingStats() {
    const now = Date.now();
    const h1 = now - 3_600_000;
    const h24 = now - 86_400_000;
    let totalVol24h = 0;
    let totalTxns24h = 0;

    for (const [poolAddr, pool] of this.pools) {
      const trades = this.trades.get(poolAddr) || [];
      let vol24h = 0, vol1h = 0, txns24h = 0, txns1h = 0;

      for (const t of trades) {
        const ts = Date.parse(t.timestamp);
        if (ts >= h24) {
          vol24h += t.valueUsd;
          txns24h++;
        }
        if (ts >= h1) {
          vol1h += t.valueUsd;
          txns1h++;
        }
      }

      pool.volume24h = vol24h;
      pool.volume1h = vol1h;
      pool.txns24h = txns24h;
      pool.txns1h = txns1h;

      totalVol24h += vol24h;
      totalTxns24h += txns24h;
    }

    this.stats.totalVolume24h = totalVol24h;
    this.stats.totalTxns24h = totalTxns24h;
  }

  computePriceChanges() {
    const now = Date.now();
    const intervals = {
      priceChange5m: 5 * 60_000,
      priceChange1h: 60 * 60_000,
      priceChange6h: 6 * 60 * 60_000,
      priceChange24h: 24 * 60 * 60_000,
    } as const;

    for (const [poolAddr, pool] of this.pools) {
      const history = this.priceHistory.get(poolAddr);
      if (!history || history.length === 0) continue;

      const currentPrice = history[history.length - 1].price;
      if (currentPrice === 0) continue;

      for (const [field, ms] of Object.entries(intervals)) {
        const targetTime = now - ms;
        // Find the price point closest to targetTime
        let closest: PricePoint | null = null;
        for (const p of history) {
          if (p.timestamp <= targetTime) {
            closest = p;
          } else {
            break;
          }
        }
        if (closest && closest.price > 0) {
          const change = ((currentPrice - closest.price) / closest.price) * 100;
          if (field === 'priceChange5m') pool.priceChange5m = change;
          else if (field === 'priceChange1h') pool.priceChange1h = change;
          else if (field === 'priceChange6h') pool.priceChange6h = change;
          else if (field === 'priceChange24h') pool.priceChange24h = change;
        }
      }
    }
  }
}

// Use globalThis to persist across Next.js dev mode recompilations
const globalForDataStore = globalThis as unknown as { __megascanDataStore?: DataStore };
export const dataStore = globalForDataStore.__megascanDataStore ?? new DataStore();
globalForDataStore.__megascanDataStore = dataStore;
