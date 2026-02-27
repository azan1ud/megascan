export interface Trade {
  id: string;
  pairAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  side: 'buy' | 'sell';
  price: number;
  amountToken: number;
  amountEth: number;
  valueUsd: number;
  maker: string;
}

export interface Candle {
  pairAddress: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  txns: number;
}
