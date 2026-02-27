import { NextResponse } from 'next/server';
import { dbGetAllTokens, dbGetStats } from '@/lib/db/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();

  try {
    const [tokens, stats] = await Promise.all([
      dbGetAllTokens(search || undefined),
      dbGetStats(),
    ]);

    return NextResponse.json({
      tokens,
      meta: {
        total: tokens.length,
        blockNumber: stats?.lastIndexedBlock ?? null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
