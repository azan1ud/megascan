'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TokenRow } from './TokenRow';
import { Filters } from './Filters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LiveDot } from '@/components/shared/LiveDot';

type SortField = 'volume24h' | 'liquidityUsd' | 'priceChange1h' | 'priceChange24h' | 'txns24h' | 'priceUsd' | 'fdv' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface PairData {
  address: string;
  dex: string;
  createdAt: string;
  liquidityUsd: number;
  volume24h: number;
  txns24h: number;
  priceChange1h: number;
  priceChange24h: number;
  token0Info: { name: string; symbol: string; decimals: number; address: string };
  token1Info: { name: string; symbol: string; decimals: number; address: string };
  priceUsd: number;
  fdv: number;
  marketCap: number;
  updatedAt: string;
}

export function TokenTable() {
  const [sortField, setSortField] = useState<SortField>('volume24h');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dexFilter, setDexFilter] = useState('all');

  const { data: pairs, isLoading, error } = useQuery<PairData[]>({
    queryKey: ['pairs', dexFilter],
    queryFn: async () => {
      const res = await fetch(`/api/pairs?dex=${dexFilter}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedPairs = useMemo(() => {
    if (!pairs) return [];
    return [...pairs].sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = a[sortField] as number;
        bVal = b[sortField] as number;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [pairs, sortField, sortDir]);

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-3 py-2 text-right text-xs font-medium text-mega-secondary cursor-pointer hover:text-mega-accent select-none whitespace-nowrap ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-mega-accent">{sortDir === 'desc' ? '▼' : '▲'}</span>
        )}
      </span>
    </th>
  );

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-mega-red">
        Failed to load pairs. Check your connection.
      </div>
    );
  }

  return (
    <div>
      <Filters dexFilter={dexFilter} onDexChange={setDexFilter} />

      <div className="screener-table-wrapper rounded-lg border border-mega-border bg-mega-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mega-border">
              <th className="sticky-col px-3 py-2 text-left text-xs font-medium text-mega-secondary w-8">#</th>
              <th className="sticky-col px-3 py-2 text-left text-xs font-medium text-mega-secondary min-w-[180px]">Token</th>
              <SortHeader field="priceUsd" label="Price" />
              <SortHeader field="priceChange1h" label="1h %" />
              <SortHeader field="priceChange24h" label="24h %" />
              <SortHeader field="volume24h" label="Volume (24h)" />
              <SortHeader field="liquidityUsd" label="Liquidity" />
              <SortHeader field="txns24h" label="Txns" />
              <SortHeader field="fdv" label="FDV" />
              <SortHeader field="createdAt" label="Age" />
              <th className="px-3 py-2 text-right text-xs font-medium text-mega-secondary">DEX</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-20">
                  <LoadingSpinner className="mx-auto" />
                </td>
              </tr>
            ) : sortedPairs.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-20 text-center text-mega-muted">
                  No pairs found
                </td>
              </tr>
            ) : (
              sortedPairs.map((pair, index) => (
                <TokenRow key={pair.address} pair={pair} rank={index + 1} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Data freshness indicator */}
      <div className="flex items-center justify-between mt-3 px-1 text-xs text-mega-muted">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span>Live data · Updates every 15s</span>
        </div>
        <span>{sortedPairs.length} pairs on MegaETH</span>
      </div>
    </div>
  );
}
