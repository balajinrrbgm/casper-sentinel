import crypto from 'node:crypto';
import type { ComplianceAttestation, RebalanceDecision } from '../types/domain.js';

interface CasperExecutionInput {
  decisions: RebalanceDecision[];
  attestation: ComplianceAttestation;
}

interface CasperExecutionResult {
  txHash: string;
  requestHash: string;
  attestationHash: string;
  mode: 'simulated' | 'real';
}

const buildDeployPayload = (input: CasperExecutionInput): string => {
  const payload = {
    entrypoint: 'record_attestation_and_rebalance',
    schema_version: 1,
    decisions: input.decisions,
    attestation: input.attestation,
    submitted_at: new Date().toISOString(),
  };

  return JSON.stringify(payload);
};

export const submitToCasperTestnet = async (
  input: CasperExecutionInput,
): Promise<CasperExecutionResult> => {
  const payload = buildDeployPayload(input);
  const requestHash = crypto.createHash('sha256').update(payload).digest('hex');
  const attestationHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(input.attestation))
    .digest('hex');

  if (process.env.CASPER_SIMULATION_MODE !== 'false') {
    return {
      txHash: `testnet-sim-${requestHash.slice(0, 48)}`,
      requestHash,
      attestationHash,
      mode: 'simulated',
    };
  }

  // Real transaction submission should be implemented with Casper SDK or MCP server
  // using environment credentials. This explicit error avoids silent assumptions.
  throw new Error(
    'Real Casper submission is not configured. Set CASPER_SIMULATION_MODE=true for local demo, or implement signed deploy submission with your testnet keys.',
  );
};
