'use client';

import { useQuery } from '@tanstack/react-query';
import { Portfolio } from '@/types';

export function usePortfolio(address: string) {
  return useQuery<Portfolio>({
    queryKey: ['portfolio', address],
    queryFn: async () => {
      const res = await fetch(`/api/portfolio/${address}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      return res.json();
    },
    enabled: !!address && address.startsWith('0x'),
    refetchInterval: 30_000,
  });
}
