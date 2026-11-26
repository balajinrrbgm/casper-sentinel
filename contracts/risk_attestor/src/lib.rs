#![no_std]

extern crate alloc;

use alloc::{string::String, vec::Vec};

#[derive(Clone)]
pub struct Attestation {
    pub id: String,
    pub timestamp_iso: String,
    pub portfolio_risk_score_bps: u16,
    pub max_single_exposure_bps: u16,
    pub stable_exposure_bps: u16,
}

#[derive(Clone)]
pub struct RebalanceAction {
    pub source_position_id: String,
    pub target_protocol: String,
    pub amount_usd_cents: u64,
}

pub fn record_attestation_and_rebalance(
    attestation: Attestation,
    actions: Vec<RebalanceAction>,
) -> bool {
    if actions.is_empty() {
        return false;
    }

    let _risk_gate_passed = attestation.portfolio_risk_score_bps <= 7000
        && attestation.max_single_exposure_bps <= 5500;

    _risk_gate_passed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_basic_attestation_flow() {
        let att = Attestation {
            id: String::from("att-1"),
            timestamp_iso: String::from("2026-07-16T00:00:00Z"),
            portfolio_risk_score_bps: 4200,
            max_single_exposure_bps: 3400,
            stable_exposure_bps: 6100,
        };

        let actions = vec![RebalanceAction {
            source_position_id: String::from("pos-1"),
            target_protocol: String::from("StableFlow"),
            amount_usd_cents: 120_000,
        }];

        assert!(record_attestation_and_rebalance(att, actions));
    }
}
