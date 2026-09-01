# Independent Scientific Audits

This directory stores adversarial physics, mathematics, and numerical-method audits for GR-4D Simulator.

## Independence

Audit work is performed by an Auditor AI separate from the Developer AI that implemented the change. The auditor must review the exact PR head SHA and attempt to falsify the implementation rather than defend it.

The auditor may read source code, tests, documentation, and PR diffs; derive equations independently; run independent numerical checks; and write audit records. During the audit it must not repair implementation code.

## Status labels

Use exactly:

- `PASS` — independently verified within stated assumptions and tolerances.
- `CONDITIONAL PASS` — evidence supports correctness but material assumptions or validation limits remain.
- `OPEN` — insufficiently verified.
- `FAIL` — a concrete physical, mathematical, numerical, dimensional, or scientific-interpretation error is demonstrated.

## Severity

Findings use:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`
- `INFO`

## Stable finding IDs

Give each finding a stable ID such as `PHOTON-AUDIT-001`. Never renumber or delete a published finding. If fixed, append the resolution commit, developer response, auditor re-test, and final status.

## Required audit header

Each audit records:

- target PR and branch;
- exact target commit SHA;
- date;
- scope;
- conventions/units;
- numerical tolerances and boundaries used for independent checks.

## Validation principle

Do not validate an implementation solely using a test that imports, copies, or algebraically reproduces the same implementation formula. Prefer three-way comparison when practical:

1. analytic derivation or trusted reference result;
2. independent reference calculation;
3. simulator output.

Use limiting cases, dimensional analysis, invariant/constraint checks, convergence under smaller step sizes, boundary sensitivity, and counterexamples.

## Merge handoff

Only an overall scientific `PASS` may authorize automatic merge. After completing the audit of the current PR head and confirming repository CI `verify` is green on the same SHA, the auditor posts exactly these machine-readable lines in a top-level PR comment:

```text
AUDIT_VERDICT: PASS
AUDIT_HEAD_SHA: <exact current PR head SHA>
```

The scientific audit auto-merge workflow validates the marker, SHA, commenter association, and CI result before merging.

For `CONDITIONAL PASS`, `OPEN`, or `FAIL`, do not post a PASS marker. Instead post findings and a developer handoff.

If any new commit is pushed after the audit, the previous PASS is invalid because its SHA no longer matches.

## Suggested audit files

Examples:

- `v0.8.0-photon-foundation.audit.md`
- `v0.9.0-ray-tracing.audit.md`
- `v1.0.0-schwarzschild.audit.md`

Audit history is part of the scientific record.
