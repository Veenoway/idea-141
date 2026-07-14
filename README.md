# Idea 141

Backtesting tool for **perpetual futures strategies** on [Perpl](https://perpl.xyz) (Monad). Built for traders who backtest seriously — inspired by tools like fxreplay, but native to the Perpl ecosystem.

## Problem

Traders on Perpl need to validate strategies before risking capital. Most backtesting tools aren't connected to Perpl's on-chain perp markets, and generic spot backtesters ignore leverage, fees, and long/short mechanics.

## Solution

Perpl Backtest Lab fetches **real OHLCV candles from the Perpl API** (Mobula fallback), runs classic strategies with **perp-aware simulation** (leverage, stop loss, take profit, taker fees), and displays professional charts with trade markers.

## Features

- **Data**: Perpl API first → Mobula fallback
- **Markets**: BTC, ETH, SOL, MON, HYPE, ZEC
- **Timeframes**: 15m, 1h, 4h, 1d
- **Strategies** (most used in trading):
  - **MA Crossover** — SMA golden/death cross (long & short)
  - **RSI** — oversold/overbought with exit at 50
  - **MACD** — line/signal crossover
- **Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands
- **Risk**: configurable capital, leverage, SL/TP, taker fee (bps)
- **Metrics**: PnL, win rate, profit factor, max drawdown, trade log, equity curve
- **Charts**: TradingView lightweight-charts (candlesticks + overlays)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment (optional)

```env
PERPL_API_URL=https://app.perpl.xyz/api
# Testnet: https://testnet.perpl.xyz/api
```

## Tech Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS
- lightweight-charts (TradingView)
- Perpl public API · Mobula API (fallback)

## Onchain attestation (Monad Mainnet)

After a backtest, users can **commit a fingerprint** of the run on Monad Mainnet via `BacktestRegistry`:

- Stores `configHash` + `resultHash` onchain
- Emits strategy, market, and PnL in the event log
- Backtester stays free — wallet only needed for optional commit

### Deploy contract (once)

```bash
# .env (never commit)
DEPLOYER_PRIVATE_KEY=0x...

npm run deploy:contract
```

This writes the address to `src/lib/deployed.ts`. Or set `NEXT_PUBLIC_BACKTEST_REGISTRY_ADDRESS` in `.env`.

Explorer: [MonadVision](https://monadvision.com)

## Hackathon — Spark / Monad

| Field | Value |
|-------|-------|
| **Name** | Perp Backtest Bench |
| **Problem** | I backtest constantly but generic tools ignore perp mechanics |
| **Solution** | Historical perp backtest + replay + optional onchain attestation |
| **Category** | Monad Mainnet |
| **Contract** | `BacktestRegistry` — run deploy script above |

## License

MIT
# backtesting-hackathon
