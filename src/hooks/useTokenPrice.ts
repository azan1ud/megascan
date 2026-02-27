'use client';

import { useQuery } from '@tanstack/react-query';

interface TokenPriceData {
  priceUsd: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidityUsd: number;
}

export function useTokenPrice(pairAddress: string) {
  return useQuery<TokenPriceData>({
    queryKey: ['tokenPrice', pairAddress],
    queryFn: async () => {
      const res = await fetch(`/api/pairs/${pairAddress}`);
      if (!res.ok) throw new Error('Failed to fetch token price');
      return res.json();
    },
    enabled: !!pairAddress,
    refetchInterval: 10_000,
  });
}
