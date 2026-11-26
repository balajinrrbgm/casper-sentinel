import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  buildComplianceAttestation,
  buildDecisions,
  estimateAprDeltaPct,
  validatePositions,
} from './agent/strategy.js';
import { submitToCasperTestnet } from './casper/adapter.js';
import type { AgentRunResult, Position } from './types/domain.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());

const samplePositions: Position[] = [
  {
    id: 'pos-01',
    asset: 'rwa_invoice',
    protocol: 'InvoicePoolX',
    amountUsd: 6200,
    apr: 12.4,
    riskScore: 67,
    tvlUsd: 1900000,
    volatility: 0.35,
  },
  {
    id: 'pos-02',
    asset: 'stable_lp',
    protocol: 'StableFlow',
    amountUsd: 2800,
    apr: 9.1,
    riskScore: 31,
    tvlUsd: 4300000,
    volatility: 0.14,
  },
  {
    id: 'pos-03',
    asset: 'treasury_bill',
    protocol: 'TBillVault',
    amountUsd: 1000,
    apr: 6.7,
    riskScore: 15,
    tvlUsd: 5800000,
    volatility: 0.06,
  },
];

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'casper-sentinel-api' });
});

app.get('/api/positions', (_req, res) => {
  res.json({ positions: samplePositions });
});

app.post('/api/agent/run', async (req, res) => {
  try {
    const positions = validatePositions(req.body?.positions ?? samplePositions);
    const decisions = buildDecisions(positions);
    const attestation = buildComplianceAttestation(positions);
    const execution = await submitToCasperTestnet({
      decisions,
      attestation,
    });

    const payload: AgentRunResult = {
      cycleId: `cycle-${Date.now()}`,
      inputPositions: positions,
      selectedDecisions: decisions,
      simulatedGasCostCspr: Number((0.17 + Math.random() * 0.06).toFixed(3)),
      projectedAprDeltaPct: estimateAprDeltaPct(positions, decisions),
      complianceAttestation: attestation,
      txHash: execution.txHash,
      network: 'casper-testnet',
      executionMode: execution.mode,
      proof: {
        requestHash: execution.requestHash,
        attestationHash: execution.attestationHash,
        mode: execution.mode,
      },
    };

    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

app.listen(port, () => {
  // Keep logs explicit for demo judges and troubleshooting.
  console.log(`Casper Sentinel API listening on http://localhost:${port}`);
});
