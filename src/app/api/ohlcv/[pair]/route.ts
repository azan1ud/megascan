import { NextResponse } from 'next/server';
import { dbGetCandlesForPool } from '@/lib/db/supabase';
import type { Timeframe } from '@/lib/store/dataStore';

const VALID_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export async function GET(
  request: Request,
  { params }: { params: { pair: string } }
) {
  const { searchParams } = new URL(request.url);
  const tf = searchParams.get('timeframe') || '1h';
  const timeframe: Timeframe = VALID_TIMEFRAMES.includes(tf as Timeframe)
    ? (tf as Timeframe)
    : '1h';
  const limit = parseInt(searchParams.get('limit') || '200');

  try {
    const candles = await dbGetCandlesForPool(
      params.pair,
      timeframe,
      Math.min(limit, 500)
    );

    return NextResponse.json({
      pair: params.pair,
      timeframe,
      candles,
    });
  } catch (error) {
    console.error('Error fetching OHLCV:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candle data' },
      { status: 500 }
    );
  }
}
