# Casper Sentinel API

Backend agent orchestrator for Casper Sentinel.

## Scripts

- `npm run dev` - start API with tsx
- `npm run typecheck` - TypeScript checks

## Environment

See `.env.example`.

## Core files

- `src/agent/strategy.ts`: deterministic risk-yield decisioning
- `src/casper/adapter.ts`: Casper testnet transaction adapter (simulation + extension point)
- `src/index.ts`: API routes
