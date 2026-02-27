/**
 * Uniswap V3 math utilities for converting on-chain price data
 * to human-readable values.
 */

/**
 * Convert sqrtPriceX96 from Uniswap V3 slot0 to a human-readable price.
 * price = (sqrtPriceX96 / 2^96)^2
 * Adjusts for token decimals: price * 10^(decimals0 - decimals1)
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number {
  // price = (sqrtPriceX96)^2 / (2^192) * 10^(decimals0 - decimals1)
  // We use floating-point for simplicity since we don't need arbitrary precision
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const price = sqrtPrice * sqrtPrice;
  const decimalAdjustment = 10 ** (decimals0 - decimals1);
  return price * decimalAdjustment;
}

/**
 * Get token price in USD given a pool with WETH.
 * If token is token0, price of token1 in token0 = slot0 price, so:
 *   tokenPriceUsd = priceInWeth * ethPriceUsd
 * The direction depends on which token is WETH.
 */
export function getTokenPriceUsd(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
  isToken0Weth: boolean,
  ethPriceUsd: number
): number {
  // slot0 price = token1 / token0 (how much token1 per 1 token0)
  const priceToken1PerToken0 = sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1);

  if (isToken0Weth) {
    // token0 = WETH, price = token1 per WETH
    // token1 price in WETH = 1 / priceToken1PerToken0
    // token1 price in USD = ethPriceUsd / priceToken1PerToken0
    if (priceToken1PerToken0 === 0) return 0;
    return ethPriceUsd / priceToken1PerToken0;
  } else {
    // token1 = WETH, price = WETH per token0? No.
    // slot0 price = token1 per token0 = WETH per token0
    // token0 price in USD = priceToken1PerToken0 * ethPriceUsd
    return priceToken1PerToken0 * ethPriceUsd;
  }
}

/**
 * Determine buy/sell side from a V3 Swap event.
 * In V3, Swap emits (amount0, amount1) where positive = token entering pool,
 * negative = token leaving pool.
 *
 * For a WETH-paired pool:
 * - If WETH is token0:
 *   - amount0 > 0 (WETH in) & amount1 < 0 (token out) → user is SELLING token for WETH → "sell"
 *   - amount0 < 0 (WETH out) & amount1 > 0 (token in) → user is BUYING token with WETH → "buy"
 * - If WETH is token1:
 *   - amount1 > 0 (WETH in) & amount0 < 0 (token out) → user is SELLING token for WETH → "sell"
 *   - amount1 < 0 (WETH out) & amount0 > 0 (token in) → user is BUYING token with WETH → "buy"
 */
export function classifyV3Swap(
  amount0: bigint,
  amount1: bigint,
  isToken0Weth: boolean
): {
  side: 'buy' | 'sell';
  absAmountWeth: bigint;
  absAmountToken: bigint;
} {
  const wethAmount = isToken0Weth ? amount0 : amount1;
  const tokenAmount = isToken0Weth ? amount1 : amount0;

  // wethAmount > 0 means WETH entering pool → user sent WETH → user is buying token
  // wethAmount < 0 means WETH leaving pool → user received WETH → user is selling token
  const side: 'buy' | 'sell' = wethAmount > 0n ? 'buy' : 'sell';

  const absAmountWeth = wethAmount < 0n ? -wethAmount : wethAmount;
  const absAmountToken = tokenAmount < 0n ? -tokenAmount : tokenAmount;

  return { side, absAmountWeth, absAmountToken };
}
