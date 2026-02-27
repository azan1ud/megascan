'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SearchBar } from '@/components/screener/SearchBar';
import { LiveDot } from '@/components/shared/LiveDot';

const NAV_LINKS = [
  { href: '/', label: 'Screener' },
  { href: '/new-pairs', label: 'New Pairs' },
  { href: '/trending', label: 'Trending' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/whales', label: 'Whales' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-mega-surface/95 backdrop-blur-sm border-b border-mega-border">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-mega-accent/20 flex items-center justify-center">
              <span className="text-mega-accent font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-lg text-mega-text hidden sm:block">
              MegaScan
            </span>
            <LiveDot />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 ml-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-mega-accent bg-mega-accent/10'
                    : 'text-mega-secondary hover:text-mega-text hover:bg-mega-card'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search + Chain Badge */}
          <div className="flex items-center gap-3 ml-auto">
            <SearchBar />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-mega-card border border-mega-border text-xs">
              <div className="w-2 h-2 rounded-full bg-mega-green"></div>
              <span className="text-mega-secondary">MegaETH</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden ml-3 p-1.5 text-mega-secondary hover:text-mega-text"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-2 border-t border-mega-border">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm ${
                  pathname === link.href
                    ? 'text-mega-accent bg-mega-accent/10'
                    : 'text-mega-secondary hover:text-mega-text'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
