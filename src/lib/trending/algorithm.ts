interface TokenStats {
  address: string;
  volume1h: number;
  avgVolume1h: number;
  priceChange1h: number;
  buys1h: number;
  sells1h: number;
  liquidityUSD: number;
  createdAt: number;
}

interface TrendingScore {
  token: string;
  score: number;
  reasons: string[];
}

export function calculateTrendingScore(token: TokenStats): TrendingScore {
  let score = 0;
  const reasons: string[] = [];

  // Volume spike: current 1h volume vs average 1h volume (last 24h)
  const volumeMultiplier = token.avgVolume1h > 0 ? token.volume1h / token.avgVolume1h : 0;
  if (volumeMultiplier > 5) { score += 40; reasons.push(`${volumeMultiplier.toFixed(0)}x volume spike`); }
  else if (volumeMultiplier > 3) { score += 25; reasons.push(`${volumeMultiplier.toFixed(0)}x volume`); }
  else if (volumeMultiplier > 2) { score += 15; reasons.push('Rising volume'); }

  // Price momentum
  if (token.priceChange1h > 100) { score += 30; reasons.push(`+${token.priceChange1h.toFixed(0)}% (1h)`); }
  else if (token.priceChange1h > 50) { score += 20; reasons.push(`+${token.priceChange1h.toFixed(0)}% (1h)`); }
  else if (token.priceChange1h > 20) { score += 10; reasons.push(`+${token.priceChange1h.toFixed(0)}% (1h)`); }

  // Buy pressure: >70% buys in last hour
  const buyRatio = token.buys1h / (token.buys1h + token.sells1h);
  if (buyRatio > 0.8) { score += 20; reasons.push('Heavy accumulation'); }
  else if (buyRatio > 0.7) { score += 10; reasons.push('Buy pressure'); }

  // New token bonus (< 24h old)
  const ageHours = (Date.now() - token.createdAt) / 3_600_000;
  if (ageHours < 1) { score += 15; reasons.push('Just launched'); }
  else if (ageHours < 6) { score += 10; reasons.push('New token'); }
  else if (ageHours < 24) { score += 5; reasons.push('< 24h old'); }

  // Minimum liquidity filter (ignore dust)
  if (token.liquidityUSD < 1000) score = 0;

  return { token: token.address, score, reasons };
}
