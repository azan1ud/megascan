'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUsd, formatNumber, formatAddress } from '@/lib/utils/format';
import { PriceChange } from '@/components/shared/PriceChange';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function PortfolioPage() {
  const [address, setAddress] = useState('');
  const [activeAddress, setActiveAddress] = useState('');

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', activeAddress],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/${activeAddress}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!activeAddress && activeAddress.startsWith('0x'),
    refetchInterval: 30_000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim().startsWith('0x')) {
      setActiveAddress(address.trim());
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-mega-text">Portfolio Tracker</h1>
        <p className="text-sm text-mega-muted mt-0.5">View token holdings for any MegaETH address</p>
      </div>

      {/* Address Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address (0x...)"
            className="flex-1 px-4 py-2.5 rounded-lg bg-mega-surface border border-mega-border text-sm text-mega-text placeholder:text-mega-muted outline-none focus:border-mega-accent transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-mega-accent/15 border border-mega-accent/30 text-sm font-medium text-mega-accent hover:bg-mega-accent/25 transition-colors"
          >
            View
          </button>
        </div>
      </form>

      {/* Portfolio Content */}
      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : portfolio ? (
        <div>
          {/* Total Value */}
          <div className="bg-mega-surface rounded-lg border border-mega-border p-6 mb-4">
            <div className="text-sm text-mega-muted mb-1">Total Portfolio Value</div>
            <div className="text-3xl font-bold font-mono text-mega-text">
              {formatUsd(portfolio.totalValueUsd)}
            </div>
            <div className="text-xs text-mega-muted mt-1">
              {formatAddress(portfolio.address)} · {portfolio.tokens.length} tokens
            </div>
          </div>

          {/* Token Holdings */}
          <div className="bg-mega-surface rounded-lg border border-mega-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mega-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-mega-secondary">Token</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-mega-secondary">24h</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.tokens.map((token: {
                  token: { address: string; name: string; symbol: string };
                  balanceFormatted: number;
                  priceUsd: number;
                  valueUsd: number;
                  change24h: number;
                }) => (
                  <tr key={token.token.address} className="border-b border-mega-border/50 hover:bg-mega-card/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-mega-card border border-mega-border flex items-center justify-center text-xs font-bold text-mega-accent">
                          {token.token.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-mega-text">{token.token.name}</div>
                          <div className="text-xs text-mega-muted">{token.token.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-mega-text">
                      {formatNumber(token.balanceFormatted)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-mega-secondary">
                      {formatUsd(token.priceUsd)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-mega-text font-medium">
                      {formatUsd(token.valueUsd)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceChange value={token.change24h} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeAddress ? (
        <div className="text-center py-20 text-mega-muted">No portfolio data found</div>
      ) : (
        <div className="text-center py-20 text-mega-muted">
          Enter a wallet address to view its MegaETH portfolio
        </div>
      )}
    </div>
  );
}
