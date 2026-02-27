let cachedPrice: { price: number; timestamp: number } | null = null;

export async function getEthPrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.timestamp < 30_000) {
    return cachedPrice.price;
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    const price = data.ethereum.usd;
    cachedPrice = { price, timestamp: Date.now() };
    return price;
  } catch {
    return cachedPrice?.price || 3000;
  }
}
