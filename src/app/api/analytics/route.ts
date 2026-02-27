import { NextResponse } from 'next/server';
import { getMegaETHTvl, getMegaETHProtocols } from '@/lib/data/defillama';
import { dbGetStats } from '@/lib/db/supabase';

export async function GET() {
  try {
    const [tvlHistory, protocols, stats] = await Promise.all([
      getMegaETHTvl(),
      getMegaETHProtocols(),
      dbGetStats(),
    ]);

    return NextResponse.json({
      tvlHistory,
      protocols: protocols.map((p) => ({
        name: p.name,
        tvl: p.chainTvls?.MegaETH || 0,
      })),
      ethPrice: stats?.ethPriceUsd ?? 3000,
      chainStats: {
        totalTvl: tvlHistory[tvlHistory.length - 1]?.totalLiquidityUSD || 0,
        activeDexes: 1,
        totalPairs: stats?.totalPools ?? 0,
        dailyVolume: stats?.totalVolume24h ?? 0,
        dailyTxns: stats?.totalTxns24h ?? 0,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
