import { NextResponse } from 'next/server';
import { dbGetWhaleTrades, dbGetTokensMap, dbGetPool } from '@/lib/db/supabase';
import { MEGAETH_CONFIG } from '@/config/chain';

const WETH = MEGAETH_CONFIG.contracts.WETH.toLowerCase();

export async function GET() {
  try {
    const trades = await dbGetWhaleTrades(50);

    // Collect unique pool addresses, then fetch pool + token data
    const poolAddrs = [...new Set(trades.map((t) => t.pairAddress))];
    const poolsMap = new Map<string, Awaited<ReturnType<typeof dbGetPool>>>();
    await Promise.all(
      poolAddrs.map(async (addr) => {
        const pool = await dbGetPool(addr);
        if (pool) poolsMap.set(addr, pool);
      })
    );

    // Collect token addresses from pools
    const tokenAddrs = new Set<string>();
    for (const pool of poolsMap.values()) {
      if (pool) {
        tokenAddrs.add(pool.token0);
        tokenAddrs.add(pool.token1);
      }
    }
    const tokensMap = await dbGetTokensMap(Array.from(tokenAddrs));

    let idCounter = 0;
    const whaleTransactions = trades.map((trade) => {
      const pool = poolsMap.get(trade.pairAddress);
      const isToken0Weth = pool ? pool.token0 === WETH : false;
      const tokenAddr = pool ? (isToken0Weth ? pool.token1 : pool.token0) : '';
      const token = tokenAddr ? tokensMap.get(tokenAddr) : undefined;

      return {
        id: idCounter++,
        txHash: trade.txHash,
        timestamp: trade.timestamp,
        token: tokenAddr,
        tokenName: token?.symbol || '???',
        fromAddress: trade.maker,
        toAddress: trade.pairAddress,
        amount: trade.amountToken,
        valueUsd: trade.valueUsd,
        type: 'swap' as const,
        dex: pool?.dex || 'kumbaya',
        label: null,
      };
    });

    return NextResponse.json({
      transactions: whaleTransactions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching whales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whale transactions' },
      { status: 500 }
    );
  }
}
