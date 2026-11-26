# risk_attestor (Casper contract scaffold)

This contract scaffold represents the on-chain component for Casper Sentinel.

Entrypoint intent:
- `record_attestation_and_rebalance(attestation, actions)`
- validates risk gates
- records compliance attestation metadata
- authorizes rebalance action payload

## Notes

- This repository includes a minimal Rust implementation for architectural clarity.
- For production submission, compile and deploy to Casper Testnet using Odra/Casper contract toolchain and then connect the backend adapter to submit signed deploys.
