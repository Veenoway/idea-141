"use client";

import {
  AreaSeries,
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { BacktestResult, Candle, StrategyParams, StrategyType } from "@/types";
import { bollinger, ema, macd, rsi, sma, stochastic } from "@/lib/indicators";
import { donchian } from "@/lib/backtest/strategies";
import { sliceByEnd, sliceCandles } from "@/lib/chart-utils";

const CHART_BG = "#17171e";
const CHART_PANEL = "#17171e";
const GRID = "rgba(255, 140, 0, 0.08)";
const GRID_SUB = "#2a2d35";
const TEXT = "#94a3b8";
const ACCENT = "#836ef9";
const ORANGE = "#ff8c00";
const BLUE = "#007aff";
const GREEN = "#22c55e";
const RED = "#ef4444";
const MARKER = "#ffffff";

interface Props {
  candles: Candle[];
  result: BacktestResult | null;
  strategy: StrategyType;
  params: StrategyParams;
  sliceEnd?: number;
}

function scrollToEnd(chart: IChartApi, len: number, replay: boolean) {
  if (replay && len > 0) {
    const from = Math.max(0, len - 60);
    chart.timeScale().setVisibleLogicalRange({ from, to: len + 2 });
  } else {
    chart.timeScale().fitContent();
  }
}

export function CandlestickChart({
  candles,
  result,
  strategy,
  params,
  sliceEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlayRef = useRef<ISeriesApi<"Line">[]>([]);
  const markersRef = useRef<{ setMarkers: (m: SeriesMarker<Time>[]) => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: TEXT,
      },
      grid: {
        vertLines: { color: GRID_SUB },
        horzLines: { color: GRID },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 400,
      timeScale: { borderColor: GRID_SUB },
      rightPriceScale: { borderColor: GRID_SUB },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: GREEN,
      downColor: RED,
      borderVisible: false,
      wickUpColor: GREEN,
      wickDownColor: RED,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    markersRef.current = createSeriesMarkers(candleSeries, []);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 400,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      overlayRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || candles.length === 0) return;

    const visible = sliceCandles(candles, sliceEnd);
    const currentTime = visible.length > 0 ? visible[visible.length - 1].time : 0;

    for (const s of overlayRef.current) {
      chart.removeSeries(s);
    }
    overlayRef.current = [];

    const toTime = (ms: number): Time => Math.floor(ms / 1000) as Time;

    const ohlc: CandlestickData[] = visible.map((c) => ({
      time: toTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(ohlc);

    const closes = visible.map((c) => c.close);
    const times = visible.map((c) => toTime(c.time));

    const addLine = (data: (number | null)[], color: string) => {
      const line = chart.addSeries(LineSeries, { color, lineWidth: 1 });
      const points: LineData[] = [];
      data.forEach((v, i) => {
        if (v != null) points.push({ time: times[i], value: v });
      });
      line.setData(points);
      overlayRef.current.push(line);
    };

    if (strategy === "ma_crossover") {
      addLine(sma(closes, params.fastPeriod), ORANGE);
      addLine(sma(closes, params.slowPeriod), ACCENT);
    } else if (strategy === "ema_crossover") {
      addLine(ema(closes, params.fastPeriod), ORANGE);
      addLine(ema(closes, params.slowPeriod), ACCENT);
    } else if (strategy === "bollinger") {
      const bb = bollinger(closes, params.bollingerPeriod, params.bollingerStdDev);
      addLine(bb.upper, ACCENT);
      addLine(bb.middle, TEXT);
      addLine(bb.lower, ACCENT);
    } else if (strategy === "breakout") {
      const ch = donchian(visible, params.breakoutPeriod);
      addLine(ch.upper, ORANGE);
      addLine(ch.lower, BLUE);
    }

    const tradeMarkers: SeriesMarker<Time>[] = [];
    for (const t of result?.trades ?? []) {
      if (t.entryTime <= currentTime) {
        tradeMarkers.push({
          time: toTime(t.entryTime),
          position: t.side === "long" ? "belowBar" : "aboveBar",
          color: MARKER,
          shape: t.side === "long" ? "arrowUp" : "arrowDown",
          text: t.side === "long" ? "BUY" : "SELL",
        });
      }
      if (t.exitTime <= currentTime) {
        tradeMarkers.push({
          time: toTime(t.exitTime),
          position: "inBar",
          color: MARKER,
          shape: "circle",
          text: "X",
        });
      }
    }

    if (tradeMarkers.length) {
      markersRef.current?.setMarkers(tradeMarkers);
    } else {
      markersRef.current?.setMarkers([]);
    }

    scrollToEnd(chart, ohlc.length, sliceEnd != null);
  }, [candles, result, strategy, params, sliceEnd]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export function RsiChart({
  candles,
  period,
  sliceEnd,
}: {
  candles: Candle[];
  period: number;
  sliceEnd?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const visible = sliceCandles(candles, sliceEnd);
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_PANEL },
        textColor: TEXT,
      },
      grid: { vertLines: { color: GRID_SUB }, horzLines: { color: GRID } },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 100,
      timeScale: { visible: false },
      rightPriceScale: { borderColor: GRID_SUB },
    });

    const line = chart.addSeries(LineSeries, { color: ACCENT, lineWidth: 2 });
    const values = rsi(
      visible.map((c) => c.close),
      period
    );
    const data: LineData[] = [];
    values.forEach((v, i) => {
      if (v != null) data.push({ time: Math.floor(visible[i].time / 1000) as Time, value: v });
    });
    line.setData(data);
    scrollToEnd(chart, data.length, sliceEnd != null);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 100,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, period, sliceEnd]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export function MacdChart({
  candles,
  fast,
  slow,
  signal,
  sliceEnd,
}: {
  candles: Candle[];
  fast: number;
  slow: number;
  signal: number;
  sliceEnd?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const visible = sliceCandles(candles, sliceEnd);
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_PANEL },
        textColor: TEXT,
      },
      grid: { vertLines: { color: GRID_SUB }, horzLines: { color: GRID } },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 100,
      timeScale: { visible: false },
      rightPriceScale: { borderColor: GRID_SUB },
    });

    const { macd: m, signal: s, histogram: h } = macd(
      visible.map((c) => c.close),
      fast,
      slow,
      signal
    );

    const hist = chart.addSeries(HistogramSeries, { color: ACCENT });
    const macdLine = chart.addSeries(LineSeries, { color: ORANGE, lineWidth: 2 });
    const signalLine = chart.addSeries(LineSeries, { color: BLUE, lineWidth: 1 });

    const histData: LineData[] = [];
    const macdData: LineData[] = [];
    const sigData: LineData[] = [];

    h.forEach((v, i) => {
      const t = Math.floor(visible[i].time / 1000) as Time;
      if (v != null) histData.push({ time: t, value: v });
      if (m[i] != null) macdData.push({ time: t, value: m[i]! });
      if (s[i] != null) sigData.push({ time: t, value: s[i]! });
    });

    hist.setData(histData);
    macdLine.setData(macdData);
    signalLine.setData(sigData);
    scrollToEnd(chart, macdData.length, sliceEnd != null);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 100,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, fast, slow, signal, sliceEnd]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export function StochasticChart({
  candles,
  kPeriod,
  dPeriod,
  sliceEnd,
}: {
  candles: Candle[];
  kPeriod: number;
  dPeriod: number;
  sliceEnd?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const visible = sliceCandles(candles, sliceEnd);
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_PANEL },
        textColor: TEXT,
      },
      grid: { vertLines: { color: GRID_SUB }, horzLines: { color: GRID } },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 100,
      timeScale: { visible: false },
      rightPriceScale: { borderColor: GRID_SUB },
    });

    const { k, d } = stochastic(
      visible.map((c) => c.high),
      visible.map((c) => c.low),
      visible.map((c) => c.close),
      kPeriod,
      dPeriod
    );

    const kLine = chart.addSeries(LineSeries, { color: ACCENT, lineWidth: 2 });
    const dLine = chart.addSeries(LineSeries, { color: ORANGE, lineWidth: 1 });

    const kData: LineData[] = [];
    const dData: LineData[] = [];
    k.forEach((v, i) => {
      const t = Math.floor(visible[i].time / 1000) as Time;
      if (v != null) kData.push({ time: t, value: v });
      if (d[i] != null) dData.push({ time: t, value: d[i]! });
    });
    kLine.setData(kData);
    dLine.setData(dData);
    scrollToEnd(chart, kData.length, sliceEnd != null);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 100,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, kPeriod, dPeriod, sliceEnd]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export function EquityChart({
  equity,
  sliceEnd,
}: {
  equity: { time: number; equity: number }[];
  sliceEnd?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || equity.length === 0) return;

    const visible = sliceByEnd(equity, sliceEnd);
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_PANEL },
        textColor: TEXT,
      },
      grid: { vertLines: { color: GRID_SUB }, horzLines: { color: GRID } },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 120,
      timeScale: { borderColor: GRID_SUB },
      rightPriceScale: { borderColor: GRID_SUB },
    });

    const line = chart.addSeries(AreaSeries, {
      lineColor: ORANGE,
      topColor: "rgba(255, 140, 0, 0.2)",
      bottomColor: "rgba(255, 140, 0, 0)",
      lineWidth: 3,
    });

    const data = visible.map((p) => ({
      time: Math.floor(p.time / 1000) as Time,
      value: p.equity,
    }));
    line.setData(data);
    scrollToEnd(chart, data.length, sliceEnd != null);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 120,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [equity, sliceEnd]);

  return <div ref={containerRef} className="w-full h-full" />;
}
