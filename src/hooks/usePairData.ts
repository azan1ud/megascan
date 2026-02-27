'use client';

import { useQuery } from '@tanstack/react-query';
import { PairWithTokens } from '@/types';

export function usePairData() {
  return useQuery<PairWithTokens[]>({
    queryKey: ['pairs'],
    queryFn: async () => {
      const res = await fetch('/api/pairs');
      if (!res.ok) throw new Error('Failed to fetch pairs');
      return res.json();
    },
    refetchInterval: 15_000,
  });
}

export function useSinglePair(address: string) {
  return useQuery<PairWithTokens>({
    queryKey: ['pair', address],
    queryFn: async () => {
      const res = await fetch(`/api/pairs/${address}`);
      if (!res.ok) throw new Error('Failed to fetch pair');
      return res.json();
    },
    enabled: !!address,
    refetchInterval: 10_000,
  });
}
