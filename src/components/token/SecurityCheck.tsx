'use client';

interface SecurityCheckProps {
  address: string;
}

interface CheckItem {
  label: string;
  status: 'safe' | 'warning' | 'danger' | 'unknown';
  detail?: string;
}

export function SecurityCheck({ address }: SecurityCheckProps) {
  // In production, these would be real on-chain checks
  // For now, show placeholder security indicators
  const checks: CheckItem[] = [
    { label: 'Contract Verified', status: 'unknown', detail: 'Check on Etherscan' },
    { label: 'Honeypot Check', status: 'unknown', detail: 'Simulation pending' },
    { label: 'Mint Function', status: 'unknown', detail: 'Analysis pending' },
    { label: 'Liquidity Locked', status: 'unknown', detail: 'Not verified' },
    { label: 'Top 10 Holders', status: 'unknown', detail: 'N/A' },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'safe':
        return <span className="text-mega-green">&#10003;</span>;
      case 'warning':
        return <span className="text-mega-warning">&#9888;</span>;
      case 'danger':
        return <span className="text-mega-red">&#10007;</span>;
      default:
        return <span className="text-mega-muted">&#8212;</span>;
    }
  };

  return (
    <div className="bg-mega-surface rounded-lg border border-mega-border p-4">
      <h3 className="text-sm font-medium text-mega-text mb-3">Security</h3>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <StatusIcon status={check.status} />
              <span className="text-mega-secondary">{check.label}</span>
            </div>
            <span className="text-mega-muted">{check.detail}</span>
          </div>
        ))}
      </div>
      <a
        href={`https://mega.etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-3 text-center text-xs text-mega-accent hover:underline"
      >
        View on Etherscan
      </a>
    </div>
  );
}
