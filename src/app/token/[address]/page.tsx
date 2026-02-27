'use client';

import { PriceChart } from '@/components/token/PriceChart';
import { TradesFeed } from '@/components/token/TradesFeed';
import { TokenInfo } from '@/components/token/TokenInfo';

interface TokenPageProps {
  params: { address: string };
}

export default function TokenPage({ params }: TokenPageProps) {
  const { address } = params;

  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Left Column - Chart + Trades */}
        <div className="space-y-4 min-w-0">
          <PriceChart pairAddress={address} />
          <TradesFeed pairAddress={address} />
        </div>

        {/* Right Column - Token Info */}
        <div className="space-y-4">
          <TokenInfo address={address} />
        </div>
      </div>
    </div>
  );
}
