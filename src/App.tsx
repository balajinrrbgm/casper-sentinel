import { useEffect, useMemo, useState } from 'react'
import { fetchPositions, runAgentCycle } from './api'
import type { AgentRunResult, Position } from './types'
import './App.css'

type Status = 'idle' | 'loading' | 'running' | 'error'

const money = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

function App() {
  const [positions, setPositions] = useState<Position[]>([])
  const [result, setResult] = useState<AgentRunResult | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const load = async (): Promise<void> => {
      setStatus('loading')
      try {
        const data = await fetchPositions()
        setPositions(data)
        setStatus('idle')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load positions')
      }
    }

    void load()
  }, [])

  const totalUsd = useMemo(
    () => positions.reduce((sum, p) => sum + p.amountUsd, 0),
    [positions],
  )

  const runCycle = async (): Promise<void> => {
    setStatus('running')
    setError('')
    try {
      const response = await runAgentCycle(positions)
      setResult(response)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Agent run failed')
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">Casper Agentic Buildathon Finalist Build</p>
        <h1>Casper Sentinel</h1>
        <p className="subtitle">
          Autonomous DeFi + RWA risk-yield orchestrator with on-chain attestation
          flow on Casper Testnet.
        </p>
        {result && (
          <p className="muted">
            Mode: {result.executionMode === 'real' ? 'REAL TESTNET' : 'SIMULATED'}
          </p>
        )}
        <button
          className="run-btn"
          type="button"
          onClick={runCycle}
          disabled={status === 'running' || status === 'loading'}
        >
          {status === 'running' ? 'Running Agent Cycle...' : 'Run Agent Cycle'}
        </button>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Portfolio Snapshot</h2>
          <p className="muted">Total Allocation: {money(totalUsd)}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>APR</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.protocol}</td>
                    <td>{p.asset}</td>
                    <td>{money(p.amountUsd)}</td>
                    <td>{p.apr.toFixed(2)}%</td>
                    <td>{p.riskScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Agent Output</h2>
          {!result && (
            <p className="muted">
              Run the agent to generate a rebalance plan and Casper testnet
              transaction proof.
            </p>
          )}
          {result && (
            <>
              <div className="metric-row">
                <div>
                  <span className="metric-label">Projected APR delta</span>
                  <strong>{result.projectedAprDeltaPct.toFixed(2)}%</strong>
                </div>
                <div>
                  <span className="metric-label">Simulated gas</span>
                  <strong>{result.simulatedGasCostCspr} CSPR</strong>
                </div>
              </div>

              <div className="decision-block">
                <h3>Rebalance Decision</h3>
                {result.selectedDecisions.length === 0 && (
                  <p>No action required this cycle.</p>
                )}
                {result.selectedDecisions.map((d) => (
                  <article key={`${d.sourcePositionId}-${d.targetProtocol}`}>
                    <p>
                      Move {money(d.amountUsd)} from {d.sourcePositionId} to{' '}
                      {d.targetProtocol} ({d.targetAsset}).
                    </p>
                    <p className="muted">{d.reason}</p>
                  </article>
                ))}
              </div>

              <div className="attestation">
                <h3>Compliance Attestation</h3>
                <p>Risk score: {result.complianceAttestation.portfolioRiskScore}</p>
                <p>
                  Max single exposure:{' '}
                  {result.complianceAttestation.maxSingleExposurePct}%
                </p>
                <p>
                  Stable exposure: {result.complianceAttestation.stableExposurePct}%
                </p>
                <p className="tx">Tx hash: {result.txHash}</p>
                <p className="tx">Request hash: {result.proof.requestHash}</p>
                <p className="tx">Attestation hash: {result.proof.attestationHash}</p>
              </div>
            </>
          )}
          {status === 'error' && <p className="error">{error}</p>}
        </section>
      </main>
    </div>
  )
}

export default App
