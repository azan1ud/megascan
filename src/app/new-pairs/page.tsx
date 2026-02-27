'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatUsd } from '@/lib/utils/format';
import { timeAgo } from '@/lib/utils/time';
import { PriceChange } from '@/components/shared/PriceChange';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LiveDot } from '@/components/shared/LiveDot';

export default function NewPairsPage() {
  const { data: pairs, isLoading } = useQuery({
    queryKey: ['pairs'],
    queryFn: async () => {
      const res = await fetch('/api/pairs?sortBy=createdAt&sortDir=desc');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-mega-text">New Pairs</h1>
          <p className="text-sm text-mega-muted mt-0.5">Recently created trading pairs on MegaETH</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-mega-muted">
          <LiveDot />
          <span>Auto-refreshes every 10s</span>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <div className="grid gap-3">
          {pairs?.map((pair: {
            address: string;
            token1Info: { name: string; symbol: string; address: string };
            priceUsd: number;
            priceChange1h: number;
            liquidityUsd: number;
            volume24h: number;
            txns24h: number;
            dex: string;
            createdAt: string;
          }) => (
            <Link
              key={pair.address}
              href={`/token/${pair.address}`}
              className="flex items-center justify-between p-4 bg-mega-surface rounded-lg border border-mega-border hover:border-mega-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-mega-card border border-mega-border flex items-center justify-center text-sm font-bold text-mega-accent">
                  {pair.token1Info.symbol.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-mega-text">{pair.token1Info.name}</span>
                    <span className="text-xs text-mega-muted">{pair.token1Info.symbol}/WETH</span>
                    <span className="badge-new bg-mega-accent/20 text-mega-accent text-[10px] px-1.5 py-0.5 rounded">NEW</span>
                  </div>
                  <div className="text-xs text-mega-muted mt-0.5">
                    {timeAgo(pair.createdAt)} · {pair.dex}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="font-mono text-mega-text">{formatUsd(pair.priceUsd)}</div>
                  <PriceChange value={pair.priceChange1h} className="text-xs" />
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-mega-muted">Liquidity</div>
                  <div className="font-mono text-mega-secondary">{formatUsd(pair.liquidityUsd)}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-xs text-mega-muted">Volume 24h</div>
                  <div className="font-mono text-mega-secondary">{formatUsd(pair.volume24h)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
