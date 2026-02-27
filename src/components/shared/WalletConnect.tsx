'use client';

import { useState } from 'react';

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    if (typeof window === 'undefined' || !(window as unknown as Record<string, unknown>).ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setConnecting(true);
    try {
      const ethereum = (window as unknown as Record<string, { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> }>).ethereum;
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts[0]) {
        setAddress(accounts[0]);
      }
    } catch {
      console.error('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  if (address) {
    return (
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-mega-card border border-mega-border text-sm text-mega-secondary hover:text-mega-text transition-colors">
        <div className="w-2 h-2 rounded-full bg-mega-green"></div>
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="px-3 py-1.5 rounded-md bg-mega-accent/10 border border-mega-accent/30 text-sm text-mega-accent hover:bg-mega-accent/20 transition-colors disabled:opacity-50"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
