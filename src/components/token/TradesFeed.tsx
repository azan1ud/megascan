'use client';

import { useQuery } from '@tanstack/react-query';
import { formatAddress, formatUsd } from '@/lib/utils/format';
import { timeAgo } from '@/lib/utils/time';
import { MEGAETH_CONFIG } from '@/config/chain';

interface Trade {
  id: string;
  txHash: string;
  timestamp: string;
  side: 'buy' | 'sell';
  price: number;
  amountToken: number;
  amountEth: number;
  valueUsd: number;
  maker: string;
}

interface TradesFeedProps {
  pairAddress: string;
}

export function TradesFeed({ pairAddress }: TradesFeedProps) {
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['trades', pairAddress],
    queryFn: async () => {
      const res = await fetch(`/api/trades/${pairAddress}`);
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
    refetchInterval: 5_000,
  });

  return (
    <div className="bg-mega-surface rounded-lg border border-mega-border">
      <div className="flex items-center justify-between p-3 border-b border-mega-border">
        <h3 className="text-sm font-medium text-mega-text">Recent Trades</h3>
        <span className="text-xs text-mega-muted">Live</span>
      </div>

      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-mega-surface">
            <tr className="border-b border-mega-border">
              <th className="px-3 py-1.5 text-left text-mega-muted font-medium">Time</th>
              <th className="px-3 py-1.5 text-left text-mega-muted font-medium">Type</th>
              <th className="px-3 py-1.5 text-right text-mega-muted font-medium">Price</th>
              <th className="px-3 py-1.5 text-right text-mega-muted font-medium">Value</th>
              <th className="px-3 py-1.5 text-right text-mega-muted font-medium">Maker</th>
              <th className="px-3 py-1.5 text-right text-mega-muted font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-mega-muted">Loading...</td>
              </tr>
            ) : trades?.map((trade) => (
              <tr
                key={trade.id}
                className={`border-b border-mega-border/30 ${
                  trade.side === 'buy' ? 'hover:bg-mega-green/5' : 'hover:bg-mega-red/5'
                }`}
              >
                <td className="px-3 py-1.5 text-mega-muted whitespace-nowrap">
                  {timeAgo(trade.timestamp)}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`font-medium ${
                    trade.side === 'buy' ? 'text-mega-green' : 'text-mega-red'
                  }`}>
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-mega-text">
                  {formatUsd(trade.price)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-mega-text">
                  {formatUsd(trade.valueUsd)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-mega-secondary">
                  {formatAddress(trade.maker, 3)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <a
                    href={`${MEGAETH_CONFIG.explorers.etherscan}/tx/${trade.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mega-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
