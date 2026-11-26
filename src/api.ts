import axios from 'axios';
import { z } from 'zod';
import type { AgentRunResult, Position } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787',
  timeout: 12000,
});

const positionSchema = z.object({
  id: z.string(),
  asset: z.enum(['rwa_invoice', 'stable_lp', 'treasury_bill']),
  protocol: z.string(),
  amountUsd: z.number(),
  apr: z.number(),
  riskScore: z.number(),
  tvlUsd: z.number(),
  volatility: z.number(),
});

const positionsResponseSchema = z.object({
  positions: z.array(positionSchema),
});

const runResultSchema = z.object({
  cycleId: z.string(),
  inputPositions: z.array(positionSchema),
  selectedDecisions: z.array(
    z.object({
      sourcePositionId: z.string(),
      targetAsset: z.enum(['rwa_invoice', 'stable_lp', 'treasury_bill']),
      targetProtocol: z.string(),
      amountUsd: z.number(),
      reason: z.string(),
      confidence: z.number(),
    }),
  ),
  simulatedGasCostCspr: z.number(),
  projectedAprDeltaPct: z.number(),
  complianceAttestation: z.object({
    attestationId: z.string(),
    timestampIso: z.string(),
    portfolioRiskScore: z.number(),
    maxSingleExposurePct: z.number(),
    stableExposurePct: z.number(),
  }),
  txHash: z.string(),
  network: z.literal('casper-testnet'),
  executionMode: z.enum(['simulated', 'real']),
  proof: z.object({
    requestHash: z.string(),
    attestationHash: z.string(),
    mode: z.enum(['simulated', 'real']),
  }),
});

export const fetchPositions = async (): Promise<Position[]> => {
  const response = await api.get('/api/positions');
  const parsed = positionsResponseSchema.parse(response.data);
  return parsed.positions;
};

export const runAgentCycle = async (positions: Position[]): Promise<AgentRunResult> => {
  const response = await api.post('/api/agent/run', { positions });
  return runResultSchema.parse(response.data) as AgentRunResult;
};
