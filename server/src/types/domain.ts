export type AssetClass = 'rwa_invoice' | 'stable_lp' | 'treasury_bill';

export interface Position {
  id: string;
  asset: AssetClass;
  protocol: string;
  amountUsd: number;
  apr: number;
  riskScore: number;
  tvlUsd: number;
  volatility: number;
}

export interface RebalanceDecision {
  sourcePositionId: string;
  targetAsset: AssetClass;
  targetProtocol: string;
  amountUsd: number;
  reason: string;
  confidence: number;
}

export interface ComplianceAttestation {
  attestationId: string;
  timestampIso: string;
  portfolioRiskScore: number;
  maxSingleExposurePct: number;
  stableExposurePct: number;
}

export type ExecutionMode = 'simulated' | 'real';

export interface ProofEnvelope {
  requestHash: string;
  attestationHash: string;
  mode: ExecutionMode;
}

export interface AgentRunResult {
  cycleId: string;
  inputPositions: Position[];
  selectedDecisions: RebalanceDecision[];
  simulatedGasCostCspr: number;
  projectedAprDeltaPct: number;
  complianceAttestation: ComplianceAttestation;
  txHash: string;
  network: 'casper-testnet';
  executionMode: ExecutionMode;
  proof: ProofEnvelope;
}
