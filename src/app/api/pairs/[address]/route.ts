import { NextResponse } from 'next/server';
import { dbGetPool, dbGetTokensMap } from '@/lib/db/supabase';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase();
    const pool = await dbGetPool(address);

    if (!pool) {
      return NextResponse.json(
        { error: 'Pair not found' },
        { status: 404 }
      );
    }

    const tokensMap = await dbGetTokensMap([pool.token0, pool.token1]);
    const token0 = tokensMap.get(pool.token0);
    const token1 = tokensMap.get(pool.token1);
    const totalSupply = token1 ? Number(token1.totalSupply) / 10 ** token1.decimals : 0;

    const pair = {
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
      priceChange5m: pool.priceChange5m,
      priceChange6h: pool.priceChange6h,
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
      priceEth: pool.priceEth,
      fdv: pool.priceUsd * totalSupply,
      marketCap: pool.priceUsd * totalSupply * 0.8,
      totalSupply: token1?.totalSupply || '0',
      holders: null,
    };

    return NextResponse.json(pair);
  } catch (error) {
    console.error('Error fetching pair:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pair data' },
      { status: 500 }
    );
  }
}
