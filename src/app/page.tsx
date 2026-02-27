import { TokenTable } from '@/components/screener/TokenTable';

export default function Home() {
  return (
    <div className="max-w-[1920px] mx-auto px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-mega-text">Token Screener</h1>
        <p className="text-sm text-mega-muted mt-0.5">
          All trading pairs on MegaETH, sorted by volume
        </p>
      </div>

      {/* Token Screener Table */}
      <TokenTable />
    </div>
  );
}
