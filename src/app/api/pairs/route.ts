import { NextResponse } from 'next/server';
import { dbGetAllPools, dbGetTokensMap } from '@/lib/db/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'volume24h';
  const sortDir = searchParams.get('sortDir') || 'desc';
  const dex = searchParams.get('dex') || 'all';

  // Map frontend camelCase sort keys to DB snake_case
  const sortKeyMap: Record<string, string> = {
    liquidityUsd: 'liquidity_usd',
    volume24h: 'volume_24h',
    txns24h: 'txns_24h',
    priceChange1h: 'price_change_1h',
    priceChange24h: 'price_change_24h',
    priceUsd: 'price_usd',
  };
  const dbSortKey = sortKeyMap[sortBy] || 'volume_24h';

  try {
    const pools = await dbGetAllPools(dbSortKey, sortDir as 'asc' | 'desc', dex);

    // Collect unique token addresses for batch fetch
    const tokenAddrs = new Set<string>();
    for (const pool of pools) {
      tokenAddrs.add(pool.token0);
      tokenAddrs.add(pool.token1);
    }
    const tokensMap = await dbGetTokensMap(Array.from(tokenAddrs));

    const pairs = pools.map((pool) => {
      const token0 = tokensMap.get(pool.token0);
      const token1 = tokensMap.get(pool.token1);
      const totalSupply = token1 ? Number(token1.totalSupply) / 10 ** token1.decimals : 0;

      return {
        address: pool.address,
        token0: pool.token0,
        token1: pool.token1,
        dex: pool.dex,
        feeTier: pool.fee,
        createdAt: pool.createdAt,
        reserve0: '0',
        reserve1: '0',
        liquidityUsd: pool.liquidityUsd,
        volume24h: pool.volume24h,
        txns24h: pool.txns24h,
        priceChange1h: pool.priceChange1h,
        priceChange24h: pool.priceChange24h,
        updatedAt: pool.updatedAt,
        token0Info: {
          name: token0?.name || 'Unknown',
          symbol: token0?.symbol || '???',
          decimals: token0?.decimals ?? 18,
          address: pool.token0,
        },
        token1Info: {
          name: token1?.name || 'Unknown',
          symbol: token1?.symbol || '???',
          decimals: token1?.decimals ?? 18,
          address: pool.token1,
        },
        priceUsd: pool.priceUsd,
        fdv: pool.priceUsd * totalSupply,
        marketCap: pool.priceUsd * totalSupply * 0.8,
      };
    });

    return NextResponse.json(pairs);
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pairs' },
      { status: 500 }
    );
  }
}
