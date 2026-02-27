export interface PortfolioToken {
  token: {
    address: string;
    name: string;
    symbol: string;
    logoUrl?: string;
  };
  balance: string;
  balanceFormatted: number;
  priceUsd: number;
  valueUsd: number;
  change24h: number;
}

export interface Portfolio {
  address: string;
  totalValueUsd: number;
  tokens: PortfolioToken[];
  lastUpdated: string;
}
