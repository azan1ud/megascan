'use client';

import Link from 'next/link';
import { PriceChange } from '@/components/shared/PriceChange';
import { formatUsd, formatNumber } from '@/lib/utils/format';
import { timeAgo } from '@/lib/utils/time';
import { DEX_CONFIG } from '@/config/chain';

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
}

interface TokenRowProps {
  pair: PairData;
  rank: number;
}

export function TokenRow({ pair, rank }: TokenRowProps) {
  const token = pair.token1Info;
  const isNew = Date.now() - new Date(pair.createdAt).getTime() < 3600000; // < 1h
  const dexName = DEX_CONFIG[pair.dex as keyof typeof DEX_CONFIG]?.name || pair.dex;

  return (
    <Link href={`/token/${pair.address}`} className="contents">
      <tr className="token-row border-b border-mega-border/50 cursor-pointer transition-colors">
        <td className="sticky-col px-3 py-2.5 text-mega-muted text-xs">{rank}</td>
        <td className="sticky-col px-3 py-2.5">
          <div className="flex items-center gap-2">
            {/* Token icon placeholder */}
            <div className="w-7 h-7 rounded-full bg-mega-card border border-mega-border flex items-center justify-center text-xs font-bold text-mega-accent shrink-0">
              {token.symbol.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-mega-text truncate">{token.name}</span>
                {isNew && (
                  <span className="badge-new bg-mega-accent/20 text-mega-accent">NEW</span>
                )}
              </div>
              <div className="text-xs text-mega-muted">
                {token.symbol}/WETH
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-sm">
          {formatUsd(pair.priceUsd)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <PriceChange value={pair.priceChange1h} />
        </td>
        <td className="px-3 py-2.5 text-right">
          <PriceChange value={pair.priceChange24h} />
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-sm text-mega-text">
          {formatUsd(pair.volume24h)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-sm text-mega-secondary">
          {formatUsd(pair.liquidityUsd)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-sm text-mega-secondary">
          {formatNumber(pair.txns24h, 0)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-sm text-mega-secondary">
          {formatUsd(pair.fdv)}
        </td>
        <td className="px-3 py-2.5 text-right text-xs text-mega-muted whitespace-nowrap">
          {timeAgo(pair.createdAt)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <span className="inline-block px-2 py-0.5 rounded text-xs bg-mega-card text-mega-secondary border border-mega-border/50">
            {dexName}
          </span>
        </td>
      </tr>
    </Link>
  );
}
