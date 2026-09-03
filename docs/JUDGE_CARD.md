# Judge card

> **Frozen competition collateral:** this document describes the official `v1.0.2` challenge entry. Post-judging candidate changes are documented separately and must not be substituted during judging.

## ForkRoom in one sentence

A live decision multiverse where agents can inspect, compare, stress-test, navigate, and stage changes—but only a human can admit a substantive change or commitment.

## Open

- Live: https://htmlpreview.github.io/?https://github.com/streetquant/forkroom-webmcp/blob/live/standalone.html
- Source: https://github.com/streetquant/forkroom-webmcp
- Video: https://drive.google.com/file/d/1SHYTAq-y0NPZjoi5L30PPboSveiUsm_2/view

## Do this

1. Click **Judge demo**.
2. Open **Audit**.
3. Observe that the agent challenge is pending and has not changed the model.
4. Inspect the structured payload.
5. Approve or reject it.
6. Open **16 tools ready** to see the complete WebMCP surface.

## Ask this

```text
Inspect the current ForkRoom decision at analysis detail. Find the single most fragile assumption, run one side-effect-free counterfactual that could change the ranking, and stage one concrete challenge with a reversible evidence test. Do not approve anything; hand authority back to me in Audit.
```

## What to notice

- 16 semantic WebMCP tools, not UI macros.
- 8 read-only analytical tools.
- 1 presentation-only navigation tool.
- 7 proposal tools behind a human approval gate.
- No tool for approval or rejection.
- Current-state reads rather than registration-time snapshots.
- Closed schemas plus runtime validation.
- Transparent robust score, downside, regret, fragility, and rank reversals.
- Human-editable values and caution.
- Pending, approved, and rejected states are visible and attributable.
- Verified single-file live artifact with source receipt.

## Verification

The current artifact passed:

- 16-tool contract audit;
- zero-warning lint;
- 26 deterministic tests;
- TypeScript/Vite build;
- standalone syntax parse;
- executable standalone boot;
- discovery of all 16 tools;
- live publication.

Full details: [`VERIFICATION.md`](./VERIFICATION.md)
