import { ethers } from 'ethers';
import { MEGAETH_CONFIG } from '@/config/chain';

let provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(MEGAETH_CONFIG.rpc.http, {
      chainId: MEGAETH_CONFIG.chainId,
      name: MEGAETH_CONFIG.name,
    });
  }
  return provider;
}

export function getContract(
  address: string,
  abi: ethers.InterfaceAbi
): ethers.Contract {
  return new ethers.Contract(address, abi, getProvider());
}
