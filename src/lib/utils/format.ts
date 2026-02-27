export function formatNumber(num: number, decimals = 2): string {
  if (num === 0) return '0';
  if (Math.abs(num) < 0.001) return '<0.001';

  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
}

export function formatUsd(num: number): string {
  if (num === 0) return '$0.00';
  if (Math.abs(num) < 0.01) return '<$0.01';

  if (Math.abs(num) >= 1_000_000_000) {
    return '$' + (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (Math.abs(num) >= 1_000_000) {
    return '$' + (num / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return '$' + (num / 1_000).toFixed(2) + 'K';
  }
  if (Math.abs(num) >= 1) {
    return '$' + num.toFixed(2);
  }
  return '$' + num.toFixed(6);
}

export function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price >= 1) return '$' + price.toFixed(2);
  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  // For very small prices, use subscript notation
  const str = price.toFixed(20);
  const match = str.match(/^0\.(0+)/);
  if (match) {
    const zeros = match[1].length;
    const significant = price.toFixed(zeros + 4).slice(zeros + 2);
    return `$0.0{${zeros}}${significant.replace(/0+$/, '')}`;
  }
  return '$' + price.toFixed(8);
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}
