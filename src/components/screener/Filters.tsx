'use client';

interface FiltersProps {
  dexFilter: string;
  onDexChange: (dex: string) => void;
}

const DEXES = [
  { id: 'all', label: 'All DEXes' },
  { id: 'kumbaya', label: 'Kumbaya' },
  { id: 'gte', label: 'GTE' },
  { id: 'world_markets', label: 'World Markets' },
  { id: 'megadex', label: 'MegaDEX' },
  { id: 'prism', label: 'Prism' },
  { id: 'megaswap', label: 'MegaSwap' },
];

export function Filters({ dexFilter, onDexChange }: FiltersProps) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
      {/* DEX Filter Pills */}
      <div className="flex items-center gap-1">
        {DEXES.map((dex) => (
          <button
            key={dex.id}
            onClick={() => onDexChange(dex.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              dexFilter === dex.id
                ? 'bg-mega-accent/15 text-mega-accent border border-mega-accent/30'
                : 'bg-mega-card text-mega-secondary border border-mega-border hover:text-mega-text hover:border-mega-muted'
            }`}
          >
            {dex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
