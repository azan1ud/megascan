'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUsd, formatNumber } from '@/lib/utils/format';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingSpinner className="py-20" />;

  const stats = data?.chainStats;

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-mega-text">Chain Analytics</h1>
        <p className="text-sm text-mega-muted mt-0.5">MegaETH network statistics and DeFi metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total TVL', value: stats ? formatUsd(stats.totalTvl) : 'N/A' },
          { label: 'Active DEXes', value: stats ? stats.activeDexes.toString() : 'N/A' },
          { label: 'Total Pairs', value: stats ? formatNumber(stats.totalPairs, 0) : 'N/A' },
          { label: 'Daily Volume', value: stats ? formatUsd(stats.dailyVolume) : 'N/A' },
          { label: 'Daily Txns', value: stats ? formatNumber(stats.dailyTxns, 0) : 'N/A' },
        ].map((stat) => (
          <div key={stat.label} className="bg-mega-surface rounded-lg border border-mega-border p-4">
            <div className="text-xs text-mega-muted mb-1">{stat.label}</div>
            <div className="text-lg font-bold font-mono text-mega-text">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Protocol TVL Breakdown */}
      {data?.protocols && data.protocols.length > 0 && (
        <div className="bg-mega-surface rounded-lg border border-mega-border p-4 mb-6">
          <h2 className="text-sm font-medium text-mega-text mb-4">Protocol TVL Breakdown</h2>
          <div className="space-y-2">
            {data.protocols.map((protocol: { name: string; tvl: number }) => (
              <div key={protocol.name} className="flex items-center justify-between">
                <span className="text-sm text-mega-secondary">{protocol.name}</span>
                <span className="text-sm font-mono text-mega-text">{formatUsd(protocol.tvl)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETH Price */}
      <div className="bg-mega-surface rounded-lg border border-mega-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-mega-secondary">ETH/USD Price</span>
          <span className="text-lg font-mono font-bold text-mega-text">
            {data?.ethPrice ? formatUsd(data.ethPrice) : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
