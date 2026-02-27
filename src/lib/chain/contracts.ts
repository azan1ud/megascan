import { getContract } from './provider';

// Uniswap V2-style Factory ABI
const FACTORY_ABI = [
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
  'function allPairsLength() view returns (uint)',
  'function allPairs(uint) view returns (address)',
  'function getPair(address, address) view returns (address)',
];

// Uniswap V2-style Pair ABI
const PAIR_ABI = [
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
  'event Sync(uint112 reserve0, uint112 reserve1)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112, uint112, uint32)',
  'function totalSupply() view returns (uint256)',
];

// Uniswap V3-style Factory ABI
const V3_FACTORY_ABI = [
  'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)',
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)',
];

// Uniswap V3-style Pool ABI
const V3_POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function fee() view returns (uint24)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
];

// ERC20 ABI
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
];

export function getFactoryContract(address: string) {
  return getContract(address, FACTORY_ABI);
}

export function getPairContract(address: string) {
  return getContract(address, PAIR_ABI);
}

export function getV3FactoryContract(address: string) {
  return getContract(address, V3_FACTORY_ABI);
}

export function getV3PoolContract(address: string) {
  return getContract(address, V3_POOL_ABI);
}

export function getERC20Contract(address: string) {
  return getContract(address, ERC20_ABI);
}

export { FACTORY_ABI, PAIR_ABI, V3_FACTORY_ABI, V3_POOL_ABI, ERC20_ABI };
