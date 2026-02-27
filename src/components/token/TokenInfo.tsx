'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUsd, formatNumber } from '@/lib/utils/format';
import { PriceChange } from '@/components/shared/PriceChange';
import { AddressBadge } from '@/components/shared/AddressBadge';
import { SecurityCheck } from './SecurityCheck';

interface TokenInfoProps {
  address: string;
}

export function TokenInfo({ address }: TokenInfoProps) {
  const { data: pair, isLoading } = useQuery({
    queryKey: ['pair', address],
    queryFn: async () => {
      const res = await fetch(`/api/pairs/${address}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="bg-mega-surface rounded-lg border border-mega-border p-4 animate-pulse">
        <div className="h-6 bg-mega-card rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-mega-card rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-mega-card rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!pair) return null;

  const stats = [
    { label: 'Market Cap', value: pair.marketCap ? formatUsd(pair.marketCap) : 'N/A' },
    { label: 'FDV', value: pair.fdv ? formatUsd(pair.fdv) : 'N/A' },
    { label: '24h Volume', value: formatUsd(pair.volume24h) },
    { label: 'Liquidity', value: formatUsd(pair.liquidityUsd) },
    { label: 'Total Supply', value: pair.totalSupply ? formatNumber(Number(pair.totalSupply), 0) : 'N/A' },
    { label: 'Holders', value: pair.holders ? formatNumber(pair.holders, 0) : 'N/A' },
  ];

  return (
    <div className="space-y-4">
      {/* Token Header */}
      <div className="bg-mega-surface rounded-lg border border-mega-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-mega-card border border-mega-border flex items-center justify-center text-lg font-bold text-mega-accent">
            {pair.token1Info?.symbol?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="font-semibold text-mega-text">{pair.token1Info?.name || 'Unknown'}</h2>
            <span className="text-sm text-mega-secondary">{pair.token1Info?.symbol || '???'}</span>
          </div>
        </div>

        {/* Contract Address */}
        <div className="mb-3">
          <AddressBadge address={address} chars={6} />
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-2xl font-bold font-mono text-mega-text">
            {formatUsd(pair.priceUsd)}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <PriceChange value={pair.priceChange24h || 0} />
            <span className="text-xs text-mega-muted">24h</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-mega-card rounded-md p-2.5">
              <div className="text-xs text-mega-muted mb-0.5">{stat.label}</div>
              <div className="text-sm font-mono text-mega-text">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pool Info */}
      <div className="bg-mega-surface rounded-lg border border-mega-border p-4">
        <h3 className="text-sm font-medium text-mega-text mb-3">Pool Info</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-mega-muted">DEX</span>
            <span className="text-mega-text capitalize">{pair.dex}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mega-muted">Pair</span>
            <AddressBadge address={pair.address} chars={4} />
          </div>
          <div className="flex justify-between">
            <span className="text-mega-muted">Created</span>
            <span className="text-mega-secondary">{new Date(pair.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Security */}
      <SecurityCheck address={address} />
    </div>
  );
}
