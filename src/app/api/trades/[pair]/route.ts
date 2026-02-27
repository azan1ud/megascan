import { NextResponse } from 'next/server';
import { dbGetTradesForPool } from '@/lib/db/supabase';

export async function GET(
  request: Request,
  { params }: { params: { pair: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const trades = await dbGetTradesForPool(
      params.pair,
      Math.min(limit, 200)
    );

    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
