/**
 * Pool indexer for Kumbaya DEX (Uniswap V3 fork) on MegaETH.
 *
 * Phases:
 * 1. Discovery - Query all PoolCreated events from factory
 * 2. Hydration - Fetch token metadata + pool state via multicall
 * 3. Backfill - Fetch recent Swap events (~1000 blocks back)
 * 4. Live listener - Listen for new Swap + PoolCreated events
 * 5. Periodic refresh - Re-fetch slot0/liquidity every 30s
 */

import { ethers } from 'ethers';
import { getProvider } from '@/lib/chain/provider';
import { V3_FACTORY_ABI, V3_POOL_ABI, ERC20_ABI } from '@/lib/chain/contracts';
import { DEX_CONFIG, MEGAETH_CONFIG } from '@/config/chain';
import { multicall } from '@/lib/chain/multicall';
import { dataStore } from '@/lib/store/dataStore';
import type { PoolData, TokenData, TradeData } from '@/lib/store/dataStore';
import { getTokenPriceUsd, classifyV3Swap } from '@/lib/utils/v3math';
import { getEthPrice } from '@/lib/data/coingecko';

const WETH = MEGAETH_CONFIG.contracts.WETH.toLowerCase();
const FACTORY_ADDRESS = DEX_CONFIG.kumbaya.factory;
const FACTORY_DEPLOY_BLOCK = 3_520_000; // Kumbaya factory deployed around block 3,520,250
const CHUNK_SIZE = 50_000; // blocks per log query chunk
const BACKFILL_BLOCKS = 5000;

const gIdx = globalThis as unknown as { __megascanIndexerRunning?: boolean };
function getIsRunning() { return gIdx.__megascanIndexerRunning ?? false; }
function setIsRunning(v: boolean) { gIdx.__megascanIndexerRunning = v; }

function log(msg: string) {
  console.log(`[Indexer] ${msg}`);
}

// ---- Phase 1: Discovery ----

interface PoolCreatedEvent {
  token0: string;
  token1: string;
  fee: number;
  pool: string;
}

async function discoverPools(): Promise<PoolCreatedEvent[]> {
  log('Phase 1: Discovering pools from factory...');
  const provider = getProvider();
  const factory = new ethers.Contract(FACTORY_ADDRESS, V3_FACTORY_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const pools: PoolCreatedEvent[] = [];

  // Query in chunks starting from factory deployment block
  let fromBlock = FACTORY_DEPLOY_BLOCK;
  while (fromBlock <= currentBlock) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    try {
      const filter = factory.filters.PoolCreated();
      const events = await factory.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        const parsed = event as ethers.EventLog;
        if (parsed.args) {
          pools.push({
            token0: parsed.args[0],
            token1: parsed.args[1],
            fee: Number(parsed.args[2]),
            pool: parsed.args[4],
          });
        }
      }
    } catch {
      log(`  Chunk ${fromBlock}-${toBlock} failed, retrying with smaller chunk...`);
      // If chunk fails, try smaller chunks
      const smallChunk = Math.floor(CHUNK_SIZE / 5);
      let subFrom = fromBlock;
      while (subFrom <= toBlock) {
        const subTo = Math.min(subFrom + smallChunk - 1, toBlock);
        try {
          const filter = factory.filters.PoolCreated();
          const events = await factory.queryFilter(filter, subFrom, subTo);
          for (const event of events) {
            const parsed = event as ethers.EventLog;
            if (parsed.args) {
              pools.push({
                token0: parsed.args[0],
                token1: parsed.args[1],
                fee: Number(parsed.args[2]),
                pool: parsed.args[4],
              });
            }
          }
        } catch {
          log(`  Sub-chunk ${subFrom}-${subTo} also failed, skipping`);
        }
        subFrom = subTo + 1;
      }
    }
    fromBlock = toBlock + 1;
  }

  log(`  Found ${pools.length} pools`);
  dataStore.stats.lastIndexedBlock = currentBlock;
  return pools;
}

// ---- Phase 2: Hydration ----

async function hydratePoolsAndTokens(pools: PoolCreatedEvent[]) {
  log('Phase 2: Hydrating token metadata and pool state...');

  // Collect unique token addresses
  const tokenAddresses = new Set<string>();
  for (const p of pools) {
    tokenAddresses.add(p.token0.toLowerCase());
    tokenAddresses.add(p.token1.toLowerCase());
  }

  // Fetch token metadata via multicall
  const tokenArr = Array.from(tokenAddresses);
  const metadataRequests = tokenArr.flatMap((addr) => [
    { target: addr, abi: ERC20_ABI, functionName: 'name' },
    { target: addr, abi: ERC20_ABI, functionName: 'symbol' },
    { target: addr, abi: ERC20_ABI, functionName: 'decimals' },
    { target: addr, abi: ERC20_ABI, functionName: 'totalSupply' },
  ]);

  // Batch multicall in small groups to avoid RPC payload limits
  const BATCH = 80;
  const metadataResults: unknown[] = [];
  for (let i = 0; i < metadataRequests.length; i += BATCH) {
    const batch = metadataRequests.slice(i, i + BATCH);
    try {
      const results = await multicall(batch);
      metadataResults.push(...results);
    } catch {
      // Fill with nulls on failure
      metadataResults.push(...new Array(batch.length).fill(null));
    }
  }

  for (let i = 0; i < tokenArr.length; i++) {
    const addr = tokenArr[i];
    const name = metadataResults[i * 4] as string | null;
    const symbol = metadataResults[i * 4 + 1] as string | null;
    const rawDecimals = metadataResults[i * 4 + 2]; // ethers v6 returns BigInt for uint8
    const totalSupply = metadataResults[i * 4 + 3] as bigint | null;

    const token: TokenData = {
      address: addr,
      name: name || 'Unknown',
      symbol: symbol || '???',
      decimals: rawDecimals != null ? Number(rawDecimals) : 18,
      totalSupply: totalSupply?.toString() || '0',
      isVerified: false,
      hasMintFunction: false,
    };
    dataStore.addToken(token);
  }

  log(`  Indexed ${tokenArr.length} tokens`);

  // Fetch pool state via multicall (slot0 + liquidity)
  const poolRequests = pools.flatMap((p) => [
    { target: p.pool, abi: V3_POOL_ABI, functionName: 'slot0' },
    { target: p.pool, abi: V3_POOL_ABI, functionName: 'liquidity' },
  ]);

  const poolResults: unknown[] = [];
  for (let i = 0; i < poolRequests.length; i += BATCH) {
    const batch = poolRequests.slice(i, i + BATCH);
    try {
      const results = await multicall(batch);
      poolResults.push(...results);
    } catch {
      poolResults.push(...new Array(batch.length).fill(null));
    }
  }

  const ethPrice = await getEthPrice();
  dataStore.ethPriceUsd = ethPrice;

  let hydratedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pools.length; i++) {
    try {
      const p = pools[i];
      const slot0Result = poolResults[i * 2];
      const liquidityResult = poolResults[i * 2 + 1];

      let sqrtPriceX96 = 0n;
      let tick = 0;
      let liquidity = 0n;

      // Safely extract slot0 values
      if (slot0Result != null) {
        try {
          // ethers v6 Result extends Array - access by index
          const raw = slot0Result as unknown[];
          if (raw[0] != null) sqrtPriceX96 = BigInt(String(raw[0]));
          if (raw[1] != null) tick = Number(String(raw[1]));
        } catch {
          // Fallback: try named properties
          try {
            const obj = slot0Result as Record<string, unknown>;
            if (obj.sqrtPriceX96 != null) sqrtPriceX96 = BigInt(String(obj.sqrtPriceX96));
            if (obj.tick != null) tick = Number(String(obj.tick));
          } catch { /* skip this pool's slot0 */ }
        }
      }

      // Safely extract liquidity
      if (liquidityResult != null) {
        try {
          liquidity = BigInt(String(liquidityResult));
        } catch { /* liquidity stays 0n */ }
      }

      const token0Data = dataStore.getToken(p.token0.toLowerCase());
      const token1Data = dataStore.getToken(p.token1.toLowerCase());
      const dec0 = token0Data?.decimals ?? 18;
      const dec1 = token1Data?.decimals ?? 18;

      const isToken0Weth = p.token0.toLowerCase() === WETH;
      const hasWeth = isToken0Weth || p.token1.toLowerCase() === WETH;

      let priceUsd = 0;
      let priceEth = 0;
      if (hasWeth && sqrtPriceX96 > 0n) {
        priceUsd = getTokenPriceUsd(sqrtPriceX96, dec0, dec1, isToken0Weth, ethPrice);
        if (!isFinite(priceUsd)) priceUsd = 0;
        priceEth = ethPrice > 0 ? priceUsd / ethPrice : 0;
      }

      // Estimate liquidity in USD
      let liquidityUsd = 0;
      if (hasWeth && liquidity > 0n && sqrtPriceX96 > 0n) {
        const sqrtPNum = Number(sqrtPriceX96) / 2 ** 96;
        const liqNum = Number(liquidity);
        if (sqrtPNum > 0 && isFinite(liqNum)) {
          if (isToken0Weth) {
            const wethAmount = liqNum / (sqrtPNum * 10 ** 18);
            liquidityUsd = wethAmount * ethPrice * 2;
          } else {
            const wethAmount = (liqNum * sqrtPNum) / 10 ** 18;
            liquidityUsd = wethAmount * ethPrice * 2;
          }
          if (!isFinite(liquidityUsd)) liquidityUsd = 0;
        }
      }

      const pool: PoolData = {
        address: p.pool.toLowerCase(),
        token0: p.token0.toLowerCase(),
        token1: p.token1.toLowerCase(),
        fee: p.fee,
        dex: 'kumbaya',
        createdAt: new Date().toISOString(),
        sqrtPriceX96,
        tick,
        liquidity,
        priceUsd,
        priceEth,
        liquidityUsd,
        volume24h: 0,
        volume1h: 0,
        txns24h: 0,
        txns1h: 0,
        priceChange5m: 0,
        priceChange1h: 0,
        priceChange6h: 0,
        priceChange24h: 0,
        updatedAt: new Date().toISOString(),
      };

      dataStore.addPool(pool);
      hydratedCount++;
    } catch (e) {
      errorCount++;
      if (errorCount <= 3) {
        log(`  Pool ${i} hydration error: ${e}`);
      }
    }
  }

  log(`  Hydrated ${hydratedCount} pools (${errorCount} errors)`);
}

// ---- Phase 3: Backfill recent swaps ----

async function backfillSwaps(pools: PoolCreatedEvent[]) {
  log('Phase 3: Backfilling recent swap events...');
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - BACKFILL_BLOCKS);
  const ethPrice = dataStore.ethPriceUsd;

  let totalSwaps = 0;

  // Process pools in batches to avoid overwhelming RPC
  const POOL_BATCH = 10;
  for (let b = 0; b < pools.length; b += POOL_BATCH) {
    const batch = pools.slice(b, b + POOL_BATCH);
    await Promise.all(
      batch.map(async (p) => {
        try {
          const poolContract = new ethers.Contract(p.pool, V3_POOL_ABI, provider);
          const filter = poolContract.filters.Swap();
          const events = await poolContract.queryFilter(filter, fromBlock, currentBlock);

          const token0Data = dataStore.getToken(p.token0.toLowerCase());
          const token1Data = dataStore.getToken(p.token1.toLowerCase());
          const dec0 = token0Data?.decimals ?? 18;
          const dec1 = token1Data?.decimals ?? 18;
          const isToken0Weth = p.token0.toLowerCase() === WETH;
          const hasWeth = isToken0Weth || p.token1.toLowerCase() === WETH;

          for (const event of events) {
            try {
              const parsed = event as ethers.EventLog;
              if (!parsed.args || !hasWeth) continue;

              const amount0 = BigInt(String(parsed.args[2]));
              const amount1 = BigInt(String(parsed.args[3]));
              const swapSqrtPriceX96 = BigInt(String(parsed.args[4]));

              const { side, absAmountWeth, absAmountToken } = classifyV3Swap(
                amount0,
                amount1,
                isToken0Weth
              );

              const tokenDecimals = isToken0Weth ? dec1 : dec0;
              const amountEth = Number(absAmountWeth) / 1e18;
              const amountToken = Number(absAmountToken) / 10 ** tokenDecimals;
              const price = getTokenPriceUsd(swapSqrtPriceX96, dec0, dec1, isToken0Weth, ethPrice);
              const valueUsd = amountEth * ethPrice;

              if (!isFinite(price) || !isFinite(valueUsd)) continue;

              // Estimate timestamp from block number (~1s per block on MegaETH)
              const blockDelta = currentBlock - (parsed.blockNumber || currentBlock);
              const estimatedTime = Date.now() - blockDelta * 1000;

              const trade: TradeData = {
                id: `${parsed.transactionHash}-${parsed.index}`,
                pairAddress: p.pool.toLowerCase(),
                txHash: parsed.transactionHash || '',
                blockNumber: parsed.blockNumber || 0,
                timestamp: new Date(estimatedTime).toISOString(),
                side,
                price,
                amountToken,
                amountEth,
                valueUsd,
                maker: parsed.args[0] || '',
              };

              dataStore.addTrade(trade);
              totalSwaps++;
            } catch {
              // Skip individual swap events that fail to parse
            }
          }
        } catch {
          // Skip pools that fail (might be empty or broken)
        }
      })
    );
  }

  log(`  Backfilled ${totalSwaps} swap events`);
  dataStore.computeRollingStats();
  dataStore.computePriceChanges();
}

// ---- Phase 4: Live polling (MegaETH RPC doesn't support eth_newFilter) ----

function startLivePolling(pools: PoolCreatedEvent[]) {
  log('Phase 4: Starting live swap polling (every 15s)...');
  let lastPolledBlock = dataStore.stats.lastIndexedBlock;

  const poll = async () => {
    try {
      const provider = getProvider();
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastPolledBlock) return;

      const fromBlock = lastPolledBlock + 1;
      const ethPrice = dataStore.ethPriceUsd;

      // Check for new pools
      try {
        const factory = new ethers.Contract(FACTORY_ADDRESS, V3_FACTORY_ABI, provider);
        const filter = factory.filters.PoolCreated();
        const newPoolEvents = await factory.queryFilter(filter, fromBlock, currentBlock);
        if (newPoolEvents.length > 0) {
          const newPools: PoolCreatedEvent[] = [];
          for (const event of newPoolEvents) {
            const parsed = event as ethers.EventLog;
            if (parsed.args) {
              newPools.push({
                token0: parsed.args[0],
                token1: parsed.args[1],
                fee: Number(parsed.args[2]),
                pool: parsed.args[4],
              });
            }
          }
          if (newPools.length > 0) {
            log(`  ${newPools.length} new pool(s) discovered`);
            await hydratePoolsAndTokens(newPools);
          }
        }
      } catch { /* ignore new pool discovery errors */ }

      // Poll recent swaps from top pools (by liquidity)
      const activePools = pools
        .filter(p => {
          const pool = dataStore.getPool(p.pool);
          return pool && pool.liquidityUsd > 100;
        })
        .slice(0, 50); // Top 50 pools to avoid RPC spam

      for (const p of activePools) {
        try {
          const poolContract = new ethers.Contract(p.pool, V3_POOL_ABI, provider);
          const swapFilter = poolContract.filters.Swap();
          const events = await poolContract.queryFilter(swapFilter, fromBlock, currentBlock);

          const token0Data = dataStore.getToken(p.token0.toLowerCase());
          const token1Data = dataStore.getToken(p.token1.toLowerCase());
          const dec0 = token0Data?.decimals ?? 18;
          const dec1 = token1Data?.decimals ?? 18;
          const isToken0Weth = p.token0.toLowerCase() === WETH;

          for (const event of events) {
            try {
              const parsed = event as ethers.EventLog;
              if (!parsed.args) continue;

              const amount0 = BigInt(String(parsed.args[2]));
              const amount1 = BigInt(String(parsed.args[3]));
              const swapSqrtPriceX96 = BigInt(String(parsed.args[4]));

              const { side, absAmountWeth, absAmountToken } = classifyV3Swap(
                amount0, amount1, isToken0Weth
              );

              const tokenDecimals = isToken0Weth ? dec1 : dec0;
              const amountEth = Number(absAmountWeth) / 1e18;
              const amountToken = Number(absAmountToken) / 10 ** tokenDecimals;
              const price = getTokenPriceUsd(swapSqrtPriceX96, dec0, dec1, isToken0Weth, ethPrice);
              const valueUsd = amountEth * ethPrice;

              if (!isFinite(price) || !isFinite(valueUsd)) continue;

              const blockDelta = currentBlock - (parsed.blockNumber || currentBlock);
              const estimatedTime = Date.now() - blockDelta * 1000;

              dataStore.addTrade({
                id: `${parsed.transactionHash}-${parsed.index}`,
                pairAddress: p.pool.toLowerCase(),
                txHash: parsed.transactionHash || '',
                blockNumber: parsed.blockNumber || 0,
                timestamp: new Date(estimatedTime).toISOString(),
                side,
                price,
                amountToken,
                amountEth,
                valueUsd,
                maker: String(parsed.args[0] || ''),
              });

              // Update pool price
              const pool = dataStore.getPool(p.pool);
              if (pool) {
                pool.sqrtPriceX96 = swapSqrtPriceX96;
                pool.priceUsd = price;
                pool.priceEth = ethPrice > 0 ? price / ethPrice : 0;
                pool.updatedAt = new Date().toISOString();
              }
            } catch { /* skip individual events */ }
          }
        } catch { /* skip pools that fail */ }
      }

      lastPolledBlock = currentBlock;
    } catch (e) {
      log(`Live poll error: ${e}`);
    }
  };

  setInterval(poll, 15_000);
  log(`  Polling swaps for active pools every 15s`);
}

// ---- Phase 5: Periodic refresh ----

function startPeriodicRefresh(pools: PoolCreatedEvent[]) {
  log('Phase 5: Starting periodic refresh (every 30s)...');

  const refresh = async () => {
    try {
      // Refresh ETH price
      const ethPrice = await getEthPrice();
      dataStore.ethPriceUsd = ethPrice;

      // Re-fetch slot0 and liquidity for all pools
      const REFRESH_BATCH = 80;
      const poolRequests = pools.flatMap((p) => [
        { target: p.pool, abi: V3_POOL_ABI, functionName: 'slot0' },
        { target: p.pool, abi: V3_POOL_ABI, functionName: 'liquidity' },
      ]);

      const results: unknown[] = [];
      for (let i = 0; i < poolRequests.length; i += REFRESH_BATCH) {
        const batch = poolRequests.slice(i, i + REFRESH_BATCH);
        try {
          const batchResults = await multicall(batch);
          results.push(...batchResults);
        } catch {
          results.push(...new Array(batch.length).fill(null));
        }
      }

      for (let i = 0; i < pools.length; i++) {
        try {
          const p = pools[i];
          const pool = dataStore.getPool(p.pool);
          if (!pool) continue;

          const slot0Result = results[i * 2];
          const liquidityResult = results[i * 2 + 1];

          if (slot0Result != null) {
            try {
              const raw = slot0Result as unknown[];
              if (raw[0] != null) pool.sqrtPriceX96 = BigInt(String(raw[0]));
              if (raw[1] != null) pool.tick = Number(String(raw[1]));
            } catch { /* keep existing values */ }
          }
          if (liquidityResult != null) {
            try {
              pool.liquidity = BigInt(String(liquidityResult));
            } catch { /* keep existing value */ }
          }

          const token0Data = dataStore.getToken(pool.token0);
          const token1Data = dataStore.getToken(pool.token1);
          const dec0 = token0Data?.decimals ?? 18;
          const dec1 = token1Data?.decimals ?? 18;
          const isToken0Weth = pool.token0 === WETH;
          const hasWeth = isToken0Weth || pool.token1 === WETH;

          if (hasWeth && pool.sqrtPriceX96 > 0n) {
            pool.priceUsd = getTokenPriceUsd(pool.sqrtPriceX96, dec0, dec1, isToken0Weth, ethPrice);
            if (!isFinite(pool.priceUsd)) pool.priceUsd = 0;
            pool.priceEth = ethPrice > 0 ? pool.priceUsd / ethPrice : 0;

            const sqrtP = Number(pool.sqrtPriceX96) / 2 ** 96;
            const liqNum = Number(pool.liquidity);
            if (sqrtP > 0 && isFinite(liqNum)) {
              if (isToken0Weth) {
                const wethAmount = liqNum / (sqrtP * 10 ** 18);
                pool.liquidityUsd = wethAmount * ethPrice * 2;
              } else {
                const wethAmount = (liqNum * sqrtP) / 10 ** 18;
                pool.liquidityUsd = wethAmount * ethPrice * 2;
              }
              if (!isFinite(pool.liquidityUsd)) pool.liquidityUsd = 0;
            }
          }

          pool.updatedAt = new Date().toISOString();
        } catch {
          // Skip pools that fail during refresh
        }
      }

      // Recompute rolling stats
      dataStore.computeRollingStats();
      dataStore.computePriceChanges();
    } catch (e) {
      log(`Periodic refresh error: ${e}`);
    }
  };

  setInterval(refresh, 30_000);
}

// ---- Main entry point ----

export async function startIndexer() {
  if (getIsRunning()) return;
  setIsRunning(true);
  dataStore.stats.indexerStartedAt = Date.now();

  log('Starting Kumbaya DEX indexer...');

  try {
    // Phase 1
    const pools = await discoverPools();

    if (pools.length === 0) {
      log('No pools found. Indexer will retry on next API call.');
      setIsRunning(false);
      return;
    }

    // Phase 2
    await hydratePoolsAndTokens(pools);

    // Phase 3
    await backfillSwaps(pools);

    // Mark indexer as ready before starting live components
    dataStore.stats.indexerReady = true;
    const elapsed = ((Date.now() - dataStore.stats.indexerStartedAt) / 1000).toFixed(1);
    log(`Indexer ready! ${pools.length} pools indexed in ${elapsed}s`);

    // Phase 4
    startLivePolling(pools);

    // Phase 5
    startPeriodicRefresh(pools);
  } catch (e) {
    log(`Indexer startup failed: ${e}`);
    setIsRunning(false);
  }
}
