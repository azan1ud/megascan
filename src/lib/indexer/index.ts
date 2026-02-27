/**
 * Indexer entry point. Lazily starts the indexer on first API call.
 * Uses globalThis to persist state across Next.js dev mode recompilations.
 */

import { startIndexer } from './poolIndexer';

export { dataStore } from '@/lib/store/dataStore';
export type { Timeframe } from '@/lib/store/dataStore';

const g = globalThis as unknown as {
  __megascanIndexerStarted?: boolean;
  __megascanIndexerPromise?: Promise<void> | null;
};

export function ensureIndexerStarted() {
  if (g.__megascanIndexerStarted) return;
  if (g.__megascanIndexerPromise) return;
  g.__megascanIndexerStarted = true;
  g.__megascanIndexerPromise = startIndexer()
    .catch((e) => {
      console.error('[Indexer] Failed to start:', e);
      g.__megascanIndexerStarted = false;
    })
    .finally(() => {
      g.__megascanIndexerPromise = null;
    });
}
