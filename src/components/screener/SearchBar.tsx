'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !focused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // If it looks like an address, go to token page
    if (trimmed.startsWith('0x') && trimmed.length === 42) {
      router.push(`/token/${trimmed}`);
    }
    // Otherwise treat as search (future: dropdown results)
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${
        focused
          ? 'border-mega-accent bg-mega-card'
          : 'border-mega-border bg-mega-bg hover:border-mega-muted'
      }`}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-mega-muted shrink-0">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search token or paste address..."
          className="bg-transparent text-sm text-mega-text placeholder:text-mega-muted outline-none w-32 sm:w-48 lg:w-64"
        />
        {!focused && (
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-mega-bg border border-mega-border text-mega-muted">
            /
          </kbd>
        )}
      </div>
    </form>
  );
}
