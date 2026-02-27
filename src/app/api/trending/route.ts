import { NextResponse } from 'next/server';
import { dbGetAllPools, dbGetTokensMap } from '@/lib/db/supabase';
import { MEGAETH_CONFIG } from '@/config/chain';

const WETH = MEGAETH_CONFIG.contracts.WETH.toLowerCase();

export async function GET() {
  try {
    const pools = await dbGetAllPools('volume_1h', 'desc');

    // Collect token addresses
    const tokenAddrs = new Set<string>();
    for (const pool of pools) {
      tokenAddrs.add(pool.token0);
      tokenAddrs.add(pool.token1);
    }
    const tokensMap = await dbGetTokensMap(Array.from(tokenAddrs));

    // Score pools by trending criteria
    const scored = pools
      .filter((p) => p.priceUsd > 0 && p.liquidityUsd > 100)
      .map((pool) => {
        const isToken0Weth = pool.token0 === WETH;
        const tokenAddr = isToken0Weth ? pool.token1 : pool.token0;
        const token = tokensMap.get(tokenAddr);

        let score = 0;
        const reasons: string[] = [];

        // Volume spike relative to liquidity
        if (pool.liquidityUsd > 0) {
          const volToLiq = pool.volume1h / pool.liquidityUsd;
          if (volToLiq > 0.5) { score += 30; reasons.push(`${(volToLiq).toFixed(1)}x vol/liq (1h)`); }
          else if (volToLiq > 0.2) { score += 15; reasons.push('Rising volume'); }
        }

        // Price change
        if (pool.priceChange1h > 20) { score += 25; reasons.push(`+${pool.priceChange1h.toFixed(0)}% (1h)`); }
        else if (pool.priceChange1h > 5) { score += 10; reasons.push(`+${pool.priceChange1h.toFixed(0)}% (1h)`); }

        // Transaction count
        if (pool.txns1h > 20) { score += 15; reasons.push('High activity'); }
        else if (pool.txns1h > 5) { score += 5; }

        // Volume absolute
        if (pool.volume1h > 10000) { score += 10; reasons.push('$' + (pool.volume1h / 1000).toFixed(0) + 'K vol (1h)'); }

        // Recency boost
        const ageMs = Date.now() - Date.parse(pool.createdAt);
        if (ageMs < 86_400_000) { score += 10; reasons.push('< 24h old'); }

        return {
          rank: 0,
          address: tokenAddr,
          poolAddress: pool.address,
          name: token?.name || 'Unknown',
          symbol: token?.symbol || '???',
          priceUsd: pool.priceUsd,
          priceChange1h: pool.priceChange1h,
          volume1h: pool.volume1h,
          liquidityUsd: pool.liquidityUsd,
          score,
          reasons: reasons.length > 0 ? reasons : ['Active pool'],
          dex: pool.dex,
          createdAt: pool.createdAt,
        };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    scored.forEach((t, i) => { t.rank = i + 1; });

    return NextResponse.json({
      tokens: scored,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tokens' },
      { status: 500 }
    );
  }
}
