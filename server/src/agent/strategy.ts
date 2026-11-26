import { z } from 'zod';
import type {
  AssetClass,
  ComplianceAttestation,
  Position,
  RebalanceDecision,
} from '../types/domain.js';

const positionSchema = z.object({
  id: z.string().min(1),
  asset: z.enum(['rwa_invoice', 'stable_lp', 'treasury_bill']),
  protocol: z.string().min(1),
  amountUsd: z.number().positive(),
  apr: z.number().nonnegative(),
  riskScore: z.number().min(0).max(100),
  tvlUsd: z.number().nonnegative(),
  volatility: z.number().min(0).max(1),
});

const positionsSchema = z.array(positionSchema).min(2);

const targetWeights: Record<AssetClass, number> = {
  rwa_invoice: 0.45,
  stable_lp: 0.35,
  treasury_bill: 0.2,
};

const riskPenalty = (riskScore: number, volatility: number): number => {
  return (riskScore / 100) * 0.6 + volatility * 0.4;
};

export const validatePositions = (input: unknown): Position[] => {
  return positionsSchema.parse(input);
};

export const buildDecisions = (positions: Position[]): RebalanceDecision[] => {
  const totalUsd = positions.reduce((sum, p) => sum + p.amountUsd, 0);

  const exposureByAsset = positions.reduce<Record<AssetClass, number>>(
    (acc, p) => {
      acc[p.asset] += p.amountUsd;
      return acc;
    },
    { rwa_invoice: 0, stable_lp: 0, treasury_bill: 0 },
  );

  const overweight = Object.entries(exposureByAsset)
    .map(([asset, amount]) => ({
      asset: asset as AssetClass,
      gap: amount / totalUsd - targetWeights[asset as AssetClass],
      amount,
    }))
    .filter((item) => item.gap > 0.08)
    .sort((a, b) => b.gap - a.gap);

  const underweight = Object.entries(exposureByAsset)
    .map(([asset, amount]) => ({
      asset: asset as AssetClass,
      gap: targetWeights[asset as AssetClass] - amount / totalUsd,
    }))
    .filter((item) => item.gap > 0.05)
    .sort((a, b) => b.gap - a.gap);

  if (overweight.length === 0 || underweight.length === 0) {
    return [];
  }

  const sourceAsset = overweight[0].asset;
  const targetAsset = underweight[0].asset;

  const sourceCandidates = positions
    .filter((p) => p.asset === sourceAsset)
    .sort(
      (a, b) =>
        b.amountUsd * riskPenalty(b.riskScore, b.volatility) -
        a.amountUsd * riskPenalty(a.riskScore, a.volatility),
    );

  const targetCandidates = positions
    .filter((p) => p.asset === targetAsset)
    .sort(
      (a, b) =>
        b.apr - riskPenalty(b.riskScore, b.volatility) -
        (a.apr - riskPenalty(a.riskScore, a.volatility)),
    );

  if (sourceCandidates.length === 0 || targetCandidates.length === 0) {
    return [];
  }

  const source = sourceCandidates[0];
  const target = targetCandidates[0];
  const amountUsd = Math.min(totalUsd * 0.1, source.amountUsd * 0.35);

  return [
    {
      sourcePositionId: source.id,
      targetAsset,
      targetProtocol: target.protocol,
      amountUsd: Math.round(amountUsd),
      reason:
        'Reduce concentration risk while improving risk-adjusted yield based on APR, volatility, and exposure targets.',
      confidence: 0.82,
    },
  ];
};

export const buildComplianceAttestation = (
  positions: Position[],
): ComplianceAttestation => {
  const totalUsd = positions.reduce((sum, p) => sum + p.amountUsd, 0);
  const weightedRisk =
    positions.reduce((sum, p) => sum + p.riskScore * p.amountUsd, 0) / totalUsd;

  const byProtocol = new Map<string, number>();
  for (const p of positions) {
    byProtocol.set(p.protocol, (byProtocol.get(p.protocol) ?? 0) + p.amountUsd);
  }

  const maxExposure =
    Math.max(...Array.from(byProtocol.values()).map((v) => (v / totalUsd) * 100)) || 0;

  const stableExposurePct =
    (positions
      .filter((p) => p.asset === 'stable_lp' || p.asset === 'treasury_bill')
      .reduce((sum, p) => sum + p.amountUsd, 0) /
      totalUsd) *
    100;

  return {
    attestationId: `att-${Date.now()}`,
    timestampIso: new Date().toISOString(),
    portfolioRiskScore: Number(weightedRisk.toFixed(2)),
    maxSingleExposurePct: Number(maxExposure.toFixed(2)),
    stableExposurePct: Number(stableExposurePct.toFixed(2)),
  };
};

export const estimateAprDeltaPct = (
  positions: Position[],
  decisions: RebalanceDecision[],
): number => {
  if (decisions.length === 0) {
    return 0;
  }

  const source = positions.find((p) => p.id === decisions[0].sourcePositionId);
  const target = positions.find((p) => p.protocol === decisions[0].targetProtocol);

  if (!source || !target) {
    return 0;
  }

  const grossGain = (target.apr - source.apr) * (decisions[0].amountUsd / 10000);
  const riskAdjustment =
    (riskPenalty(source.riskScore, source.volatility) -
      riskPenalty(target.riskScore, target.volatility)) *
    0.7;

  return Number((grossGain + riskAdjustment).toFixed(2));
};
