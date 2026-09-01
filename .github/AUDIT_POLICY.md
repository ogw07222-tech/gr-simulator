# Scientific Audit Policy

This repository separates implementation from scientific audit for physics-bearing pull requests.

## Roles

- **Developer AI:** implements and modifies source code on feature/fix branches.
- **Auditor AI:** independently reviews the exact pull-request head, checks physical/mathematical/numerical claims, and does not modify implementation code while auditing.

The developer's tests and summaries are evidence to inspect, not proof of correctness.

## Scientific verdicts

The auditor uses exactly:

- `PASS`
- `CONDITIONAL PASS`
- `OPEN`
- `FAIL`

Only `PASS` is eligible for scientific auto-merge.

An unresolved CRITICAL finding always blocks merge. An unresolved HIGH finding that affects advertised physics also blocks merge.

## Exact-SHA rule

An audit applies only to the exact PR head commit that was reviewed.

A PASS marker must contain:

```text
AUDIT_VERDICT: PASS
AUDIT_HEAD_SHA: <40-character current PR head SHA>
```

If the PR head changes, the old audit is invalid. The auditor must re-read and re-audit the new head and post a new PASS marker only if it passes.

## CI rule

Scientific auto-merge additionally requires the existing aggregate CI check named `verify` to have concluded `success` on the same audited head SHA. The `verify` job aggregates lint, unit tests, physics validation, build, and smoke tests.

## Auto-merge behavior

`.github/workflows/scientific-audit-automerge.yml` listens for PR conversation comments. It merges only when all of the following are true:

1. the comment belongs to a pull request;
2. the commenter is trusted by GitHub as `OWNER`, `MEMBER`, or `COLLABORATOR`;
3. the comment contains `AUDIT_VERDICT: PASS`;
4. the comment contains `AUDIT_HEAD_SHA:` equal to the PR's current head SHA;
5. the existing `verify` CI check is green on that same SHA.

The merge request includes the expected head SHA, so a race that changes the PR head before merge is rejected by GitHub.

`CONDITIONAL PASS`, `OPEN`, and `FAIL` must never emit the PASS marker.

## Audit records

Persistent scientific audit records live under `audits/`. Findings are never erased. When resolved, append the fix commit and revalidation result while preserving the original finding.

## Scope

Physics-bearing changes include, at minimum, geodesic equations, spacetime models, initial-condition construction, conserved quantities, numerical integration, physical diagnostics, scientific visualization semantics, and claims about simulated observables.

Pure presentation changes may receive a narrower audit, but must not be represented as scientific validation.
