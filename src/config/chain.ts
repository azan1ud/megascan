export const MEGAETH_CONFIG = {
  chainId: 4326,
  chainIdHex: '0x10e6',
  name: 'MegaETH',
  rpc: {
    http: process.env.NEXT_PUBLIC_MEGAETH_RPC || 'https://mainnet.megaeth.com/rpc',
  },
  explorers: {
    etherscan: 'https://mega.etherscan.io',
    blockscout: 'https://megaeth.blockscout.com',
    miniblocks: 'https://miniblocks.io',
  },
  contracts: {
    WETH: '0x4200000000000000000000000000000000000006',
    MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    USDM: '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7',
  },
  gas: {
    baseFee: '0.001 gwei',
  },
  blockTime: {
    miniBlock: 10,
    evmBlock: 1000,
  },
};

export const DEX_CONFIG = {
  kumbaya: {
    name: 'Kumbaya',
    type: 'amm_v3' as const,
    factory: '0x68b34591f662508076927803c567Cc8006988a09',
    router: '0x15631604D62A41610E92FB69B04C35a5e8c6E068',
    quoter: '0x5e97B083e4Cd25Fd40558D1Bb72e13A178335a78',
    positionManager: '0x833E4083B7ae46CeA735023954E0bb2953b64881',
    poolInitCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
  },
  gte: {
    name: 'GTE',
    type: 'clob_amm' as const,
    factory: '',
    router: '',
  },
  world_markets: {
    name: 'World Markets',
    type: 'clob' as const,
    factory: '',
    router: '',
  },
  megadex: {
    name: 'MegaDEX',
    type: 'amm' as const,
    factory: '',
    router: '',
  },
  prism: {
    name: 'Prism DEX',
    type: 'amm' as const,
    factory: '',
    router: '',
  },
  megaswap: {
    name: 'MegaSwap',
    type: 'amm' as const,
    factory: '',
    router: '',
  },
} as const;

export type DexId = keyof typeof DEX_CONFIG;
