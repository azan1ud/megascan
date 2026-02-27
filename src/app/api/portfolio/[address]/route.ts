import { NextResponse } from 'next/server';

function generateMockPortfolio(address: string) {
  const tokens = [
    { name: 'Wrapped Ether', symbol: 'WETH', price: 3000, balance: 2.5 },
    { name: 'MegaDoge', symbol: 'MDOGE', price: 0.00042, balance: 5000000 },
    { name: 'Based Mega', symbol: 'BMEGA', price: 2.45, balance: 1200 },
    { name: 'Mega AI', symbol: 'MAI', price: 1.23, balance: 500 },
    { name: 'USDM', symbol: 'USDM', price: 1.0, balance: 1500 },
  ];

  const portfolioTokens = tokens.map((t, i) => ({
    token: {
      address: `0x${(i + 300).toString(16).padStart(40, '0')}`,
      name: t.name,
      symbol: t.symbol,
    },
    balance: t.balance.toString(),
    balanceFormatted: t.balance,
    priceUsd: t.price,
    valueUsd: t.price * t.balance,
    change24h: (Math.random() - 0.4) * 20,
  }));

  const totalValue = portfolioTokens.reduce((sum, t) => sum + t.valueUsd, 0);

  return {
    address,
    totalValueUsd: totalValue,
    tokens: portfolioTokens,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const portfolio = generateMockPortfolio(params.address);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
