export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-mega-green opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-mega-green"></span>
    </span>
  );
}
