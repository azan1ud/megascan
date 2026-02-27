'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUsd, formatAddress } from '@/lib/utils/format';
import { timeAgo } from '@/lib/utils/time';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LiveDot } from '@/components/shared/LiveDot';
import { MEGAETH_CONFIG } from '@/config/chain';

interface WhaleTxn {
  id: number;
  txHash: string;
  timestamp: string;
  tokenName: string;
  fromAddress: string;
  toAddress: string;
  valueUsd: number;
  type: 'swap' | 'transfer';
  dex: string | null;
  label: string | null;
}

export default function WhalesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['whales'],
    queryFn: async () => {
      const res = await fetch('/api/whales');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-mega-text">Whale Tracker</h1>
          <p className="text-sm text-mega-muted mt-0.5">
            Large transactions on MegaETH (swaps &gt;$10K, transfers &gt;$50K)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-mega-muted">
          <LiveDot />
          <span>Live tracking</span>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <div className="bg-mega-surface rounded-lg border border-mega-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mega-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary">Token</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary">Wallet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary hidden md:table-cell">DEX</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">Tx</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions?.map((txn: WhaleTxn) => (
                <tr key={txn.id} className="border-b border-mega-border/50 hover:bg-mega-card/50">
                  <td className="px-4 py-3 text-xs text-mega-muted whitespace-nowrap">
                    {timeAgo(txn.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      txn.type === 'swap'
                        ? 'bg-mega-accent/10 text-mega-accent'
                        : 'bg-mega-warning/10 text-mega-warning'
                    }`}>
                      {txn.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-mega-text">{txn.tokenName}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-mega-text">
                    {formatUsd(txn.valueUsd)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-mega-secondary">
                        {formatAddress(txn.fromAddress, 4)}
                      </span>
                      {txn.label && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-mega-card text-mega-accent">
                          {txn.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-mega-secondary capitalize hidden md:table-cell">
                    {txn.dex || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`${MEGAETH_CONFIG.explorers.etherscan}/tx/${txn.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-mega-accent hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
