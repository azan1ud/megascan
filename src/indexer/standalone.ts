/**
 * Standalone indexer entry point.
 *
 * Run with: npm run indexer
 *           (or: npx tsx src/indexer/standalone.ts)
 *
 * This script:
 * 1. Starts the in-memory indexer (discovery → hydration → backfill → live poll)
 * 2. Once the indexer is ready, performs a full sync to Supabase
 * 3. Then syncs deltas every 15 seconds
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MEGAETH_RPC
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { startIndexer } from '@/lib/indexer/poolIndexer';
import { dataStore } from '@/lib/store/dataStore';
import { syncAllToSupabase, syncDeltaToSupabase } from './syncLayer';

const SYNC_INTERVAL_MS = 15_000;

function log(msg: string) {
  console.log(`[Standalone] ${msg}`);
}

async function main() {
  log('Starting standalone indexer...');

  // Validate env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_MEGAETH_RPC) {
    log('NEXT_PUBLIC_MEGAETH_RPC not set, using default: https://mainnet.megaeth.com/rpc');
  }

  // Start the in-memory indexer
  log('Starting in-memory indexer (discovery + hydration + backfill)...');
  await startIndexer();

  // Wait for indexer to be ready
  log('Waiting for indexer to be ready...');
  while (!dataStore.stats.indexerReady) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  log(`Indexer ready! ${dataStore.stats.totalPools} pools, ${dataStore.getAllTokens().length} tokens`);

  // Full initial sync
  await syncAllToSupabase();

  // Periodic delta sync
  log(`Starting periodic sync every ${SYNC_INTERVAL_MS / 1000}s...`);
  setInterval(async () => {
    try {
      await syncDeltaToSupabase();
    } catch (e) {
      log(`Periodic sync error: ${e}`);
    }
  }, SYNC_INTERVAL_MS);

  // Keep process alive
  log('Indexer running. Press Ctrl+C to stop.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
