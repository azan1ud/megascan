'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatUsd } from '@/lib/utils/format';
import { PriceChange } from '@/components/shared/PriceChange';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TrendingToken {
  rank: number;
  address: string;
  poolAddress?: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceChange1h: number;
  volume1h: number;
  liquidityUsd: number;
  score: number;
  reasons: string[];
  dex: string;
  createdAt: string;
}

export default function TrendingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await fetch('/api/trending');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 300_000, // 5 min
  });

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-mega-text">Trending Tokens</h1>
        <p className="text-sm text-mega-muted mt-0.5">
          Top tokens by momentum score · Updated every 5 minutes
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <div className="grid gap-3">
          {data?.tokens?.map((token: TrendingToken) => (
            <Link
              key={token.address}
              href={`/token/${token.poolAddress || token.address}`}
              className="flex items-center gap-4 p-4 bg-mega-surface rounded-lg border border-mega-border hover:border-mega-accent/30 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 h-8 rounded-full bg-mega-card flex items-center justify-center text-sm font-bold text-mega-accent shrink-0">
                {token.rank}
              </div>

              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-mega-text">{token.name}</span>
                  <span className="text-xs text-mega-muted">{token.symbol}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {token.reasons.map((reason: string, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-mega-accent/10 text-mega-accent"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price + Score */}
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-sm text-mega-text">{formatUsd(token.priceUsd)}</div>
                  <PriceChange value={token.priceChange1h} className="text-xs" />
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-mega-muted">Score</div>
                  <div className="font-mono text-sm font-bold text-mega-accent">{token.score}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-xs text-mega-muted">Liquidity</div>
                  <div className="font-mono text-sm text-mega-secondary">{formatUsd(token.liquidityUsd)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
