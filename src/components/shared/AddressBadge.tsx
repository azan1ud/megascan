'use client';

import { useState } from 'react';
import { formatAddress } from '@/lib/utils/format';
import { MEGAETH_CONFIG } from '@/config/chain';

interface AddressBadgeProps {
  address: string;
  chars?: number;
  showCopy?: boolean;
  linkToExplorer?: boolean;
}

export function AddressBadge({
  address,
  chars = 4,
  showCopy = true,
  linkToExplorer = true,
}: AddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-mega-secondary hover:text-mega-accent transition-colors">
      {formatAddress(address, chars)}
      {showCopy && (
        <button onClick={handleCopy} className="hover:text-mega-accent" title="Copy address">
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          )}
        </button>
      )}
    </span>
  );

  if (linkToExplorer) {
    return (
      <a
        href={`${MEGAETH_CONFIG.explorers.etherscan}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return content;
}
