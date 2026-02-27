'use client';

import { useQuery } from '@tanstack/react-query';
import { Trade } from '@/types';

export function useRecentTrades(pairAddress: string) {
  return useQuery<Trade[]>({
    queryKey: ['trades', pairAddress],
    queryFn: async () => {
      const res = await fetch(`/api/trades/${pairAddress}`);
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
    enabled: !!pairAddress,
    refetchInterval: 5_000,
  });
}
