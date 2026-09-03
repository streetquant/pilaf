# ForkRoom v1.1.0-post.1 — post-judging hardening candidate

> This is not the WebMCP Challenge submission. The judged artifact remains frozen at [`v1.0.2`](https://github.com/streetquant/forkroom-webmcp/releases/tag/v1.0.2), commit `9b42593ac2cb03d645cda5dc1dbb910fd859a0ac`.

## What changed

- Added deep, bounded, referential validation for browser storage and imported snapshots.
- Added optimistic `expected_revision` preconditions to all seven proposal tools.
- Preserved proposal provenance as `basedOnRevision`.
- Added structured execution receipts with invocation ID, effect, before/after revision, and canonical state-change status.
- Added the incubator-main `consequentialHint` to proposal tools while preserving published annotations.
- Exposed receipt details in the visible activity rail and protocol lens.
- Expanded the deterministic suite from 26 tests in four files to 35 tests in five files.
- Added static gates for every new authority and integrity invariant.

## Authority remains unchanged

The agent can inspect, compare, stress-test, navigate, and stage. It still cannot approve, reject, directly edit normative inputs, or finalize a commitment. Stale-revision defense narrows authority further; it does not expand it.

## Promotion rule

Do not apply this candidate to the judged repository or live site during judging. After judging—or with explicit organizer permission—promote through a new release without rewriting `v1.0.2`.
