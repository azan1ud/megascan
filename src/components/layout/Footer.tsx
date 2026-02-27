export function Footer() {
  return (
    <footer className="border-t border-mega-border bg-mega-surface py-4">
      <div className="max-w-[1920px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-mega-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-mega-secondary">MegaScan</span>
          <span>Real-time token intelligence for MegaETH</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://mega.etherscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-mega-text transition-colors"
          >
            Explorer
          </a>
          <a
            href="https://megaeth.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-mega-text transition-colors"
          >
            MegaETH
          </a>
          <span>Data updates in real-time</span>
        </div>
      </div>
    </footer>
  );
}
