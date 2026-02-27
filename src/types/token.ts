export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  logoUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  isVerified: boolean;
  hasMintFunction: boolean;
  createdAt?: string;
  updatedAt?: string;
}
