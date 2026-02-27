interface PriceChangeProps {
  value: number;
  className?: string;
}

export function PriceChange({ value, className = '' }: PriceChangeProps) {
  const isPositive = value >= 0;
  const color = isPositive ? 'text-mega-green' : 'text-mega-red';
  const sign = isPositive ? '+' : '';

  return (
    <span className={`font-mono text-sm ${color} ${className}`}>
      {sign}{value.toFixed(2)}%
    </span>
  );
}
