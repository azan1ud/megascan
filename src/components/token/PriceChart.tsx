'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, Time } from 'lightweight-charts';

interface PriceChartProps {
  pairAddress: string;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;

export function PriceChart({ pairAddress }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState('1h');

  const { data } = useQuery({
    queryKey: ['ohlcv', pairAddress, timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/ohlcv/${pairAddress}?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch OHLCV');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161B22' },
        textColor: '#8B949E',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1C2333' },
        horzLines: { color: '#1C2333' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#00D4FF', width: 1, style: 2, labelBackgroundColor: '#00D4FF' },
        horzLine: { color: '#00D4FF', width: 1, style: 2, labelBackgroundColor: '#00D4FF' },
      },
      rightPriceScale: {
        borderColor: '#30363D',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#30363D',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00C853',
      downColor: '#FF1744',
      borderDownColor: '#FF1744',
      borderUpColor: '#00C853',
      wickDownColor: '#FF1744',
      wickUpColor: '#00C853',
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!data?.candles || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    // Sort by time ascending and deduplicate (library requires strict asc order)
    const sorted = [...data.candles]
      .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
      .filter((c: { time: number }, i: number, arr: { time: number }[]) => i === 0 || c.time > arr[i - 1].time);

    const candles = sorted.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumes = sorted.map((c: { time: number; open: number; close: number; volume: number }) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 23, 68, 0.3)',
    }));

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="bg-mega-surface rounded-lg border border-mega-border">
      {/* Timeframe selector */}
      <div className="flex items-center gap-1 p-2 border-b border-mega-border">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              timeframe === tf
                ? 'bg-mega-accent/15 text-mega-accent'
                : 'text-mega-muted hover:text-mega-secondary'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
