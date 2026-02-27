import { MEGAETH_CONFIG } from '@/config/chain';

const WETH_ADDRESS = MEGAETH_CONFIG.contracts.WETH.toLowerCase();

let cachedEthPrice: number = 0;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30_000; // 30 seconds

export async function getEthUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedEthPrice > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedEthPrice;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    );
    const data = await response.json();
    cachedEthPrice = data.ethereum.usd;
    lastFetchTime = now;
    return cachedEthPrice;
  } catch {
    return cachedEthPrice || 3000; // Fallback
  }
}

export function getPriceFromSwap(
  amount0In: bigint,
  amount0Out: bigint,
  amount1In: bigint,
  amount1Out: bigint,
  token0Decimals: number,
  token1Decimals: number
): number {
  if (amount0In > 0n) {
    return Number(amount1Out) / 10 ** token1Decimals / (Number(amount0In) / 10 ** token0Decimals);
  } else {
    return Number(amount1In) / 10 ** token1Decimals / (Number(amount0Out) / 10 ** token0Decimals);
  }
}

export function classifySwap(
  token0: string,
  amount0In: bigint,
  amount1In: bigint,
): 'buy' | 'sell' {
  const isToken0Weth = token0.toLowerCase() === WETH_ADDRESS;

  if (isToken0Weth) {
    return amount0In > 0n ? 'buy' : 'sell';
  } else {
    return amount1In > 0n ? 'buy' : 'sell';
  }
}
