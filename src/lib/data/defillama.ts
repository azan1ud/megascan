interface ProtocolData {
  name: string;
  tvl: number;
  chainTvls: Record<string, number>;
}

interface TvlDataPoint {
  date: number;
  totalLiquidityUSD: number;
}

export async function getMegaETHTvl(): Promise<TvlDataPoint[]> {
  try {
    const res = await fetch('https://api.llama.fi/v2/historicalChainTvl/MegaETH');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getMegaETHProtocols(): Promise<ProtocolData[]> {
  try {
    const res = await fetch('https://api.llama.fi/protocols');
    if (!res.ok) return [];
    const protocols: ProtocolData[] = await res.json();
    return protocols.filter(
      (p) => p.chainTvls && ('MegaETH' in p.chainTvls)
    );
  } catch {
    return [];
  }
}
