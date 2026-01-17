# FLINT Healthcare Compliance Policy (V1)

## Objectives
- Ensure patient data privacy (HIPAA/GDPR alignment).
- Verify clinical decision integrity.
- Minimize outlier risks in automated diagnostic aids.

## Rules
1. **Data Minimization**: Reject any decision path that requests PII beyond necessary clinical scope.
2. **Attestation Required**: All laboratory data must be pinned to a verifiable cryptographic hash.
3. **Thresholds**: Any risk score > 0.4 in diagnostic recommendations must trigger a 'Human-in-the-loop' flag.
4. **Audit Trail**: Every decision must log the specific medical registry version used for reference.
