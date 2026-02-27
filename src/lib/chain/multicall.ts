import { ethers } from 'ethers';
import { getProvider } from './provider';
import { MEGAETH_CONFIG } from '@/config/chain';

const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])',
];

interface MulticallRequest {
  target: string;
  abi: ethers.InterfaceAbi;
  functionName: string;
  args?: unknown[];
}

export async function multicall(requests: MulticallRequest[]): Promise<unknown[]> {
  const provider = getProvider();
  const multicall3 = new ethers.Contract(
    MEGAETH_CONFIG.contracts.MULTICALL3,
    MULTICALL3_ABI,
    provider
  );

  const calls = requests.map((req) => {
    const iface = new ethers.Interface(
      typeof req.abi === 'string' ? [req.abi] : req.abi as string[]
    );
    const callData = iface.encodeFunctionData(req.functionName, req.args || []);
    return {
      target: req.target,
      allowFailure: true,
      callData,
    };
  });

  const results = await multicall3.aggregate3(calls);

  return results.map((result: { success: boolean; returnData: string }, i: number) => {
    if (!result.success) return null;
    try {
      const iface = new ethers.Interface(
        typeof requests[i].abi === 'string'
          ? [requests[i].abi]
          : requests[i].abi as string[]
      );
      const decoded = iface.decodeFunctionResult(
        requests[i].functionName,
        result.returnData
      );
      return decoded.length === 1 ? decoded[0] : decoded;
    } catch {
      return null;
    }
  });
}
