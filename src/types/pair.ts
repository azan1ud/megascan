import { DexId } from '@/config/chain';

export interface Pair {
  address: string;
  token0: string;
  token1: string;
  dex: DexId;
  feeTier?: number;
  createdAt: string;
  createdTx?: string;
  reserve0: string;
  reserve1: string;
  liquidityUsd: number;
  volume24h: number;
  txns24h: number;
  priceChange1h: number;
  priceChange24h: number;
  updatedAt: string;
}

export interface PairWithTokens extends Pair {
  token0Info: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
  token1Info: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
  priceUsd: number;
  fdv: number;
  marketCap: number;
}
