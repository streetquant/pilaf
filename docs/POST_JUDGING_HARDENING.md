# ForkRoom v1.1.0-post.1 hardening candidate

## Status and boundary

This is post-submission development. The challenge entry remains frozen at `v1.0.2` / `9b42593ac2cb03d645cda5dc1dbb910fd859a0ac`. None of the changes below are part of the judged artifact unless the competition organizer explicitly permits a post-deadline correction.

## Objective

Strengthen the transition from agent observation to human-reviewed proposal without expanding agent authority.

Let `r_o` be the model revision observed by an agent and `r_c` the revision at proposal execution. A proposal is admissible for staging only when:

```text
r_o = r_c.
```

If `r_o != r_c`, ForkRoom rejects the call before creating a proposal. This prevents a structurally valid but stale plan from being attached to a decision that changed after the agent inspected it.

## 1. Optimistic revision preconditions

All seven proposal tools now require:

```json
{ "expected_revision": 17 }
```

The value must be a safe integer equal to the current browser-local model revision. The error directs the agent to call `forkroom_inspect_decision` again.

Each accepted proposal stores `basedOnRevision`, and the visible receipt reports `based_on_revision`. A second proposal cannot reuse a revision after the first proposal increments the model; the agent must re-inspect.

## 2. Execution receipts

Every successful tool result includes:

```json
{
  "receipt": {
    "invocation_id": "...",
    "effect": "none | presentation-only | proposal-staged",
    "model_revision_before": 17,
    "model_revision_after": 18,
    "state_changed": true
  }
}
```

The same values enter the visible invocation ledger. `state_changed` refers to the canonical decision revision. Presentation-only navigation deliberately leaves it false.

## 3. Deep snapshot validation

The previous guard checked only a few root fields. The candidate validates:

- recognized root and entity fields;
- bounded collection sizes and strings;
- finite numeric domains and integer revisions;
- unique identifiers;
- exact option score/exposure maps;
- references among options, criteria, futures, assumptions, proposals, and commitments;
- proposal payload structure by proposal kind;
- review-state consistency;
- proposal payload serialization size;
- proposal provenance not newer than the containing snapshot.

Invalid browser storage falls back to the deterministic demo. Invalid imports produce concise field-level errors and are not loaded.

## 4. Annotation evolution

The published August 2026 WebMCP report defines `readOnlyHint` and `untrustedContentHint`. Incubator `main` additionally carries `consequentialHint`. The candidate emits that field only for proposal tools, whose immediate effect is to mutate the visible pending-proposal ledger. Canonical decision mutation remains human-gated.

Unknown Web IDL dictionary members are forward-compatible in older implementations; the current annotations remain unchanged.

## 5. Verification matrix

| Property | Check |
| --- | --- |
| Seven revision-aware schemas | static contract audit |
| Seven runtime revision guards | static contract audit |
| Stale call stages nothing | protocol test |
| Successful proposal records provenance | protocol test |
| Read/navigation/proposal receipts | protocol tests |
| Seven consequential proposal annotations | protocol test |
| Valid demo imports | validation test |
| Unknown fields rejected | validation test |
| Exact relation maps | validation test |
| Duplicate and dangling IDs rejected | validation test |
| Proposal payload and provenance checked | validation test |
| Review-state consistency | validation test |
| Collection and payload bounds | validation test |
| Actionable import errors | validation test |
| Full product demo retains human gate | product integration test |

Expected suite size: **35 deterministic tests across five files**, plus lint, TypeScript/Vite build, standalone syntax validation, and executable standalone boot/tool discovery.

## Non-goals

- no new agent authority;
- no direct approval tool;
- no claim of cryptographic audit integrity;
- no server-side collaboration or identity system;
- no replacement of the frozen challenge entry;
- no claim that `consequentialHint` is in every deployed WebMCP implementation.

## Promotion rule

Promote this candidate only after judging or explicit organizer permission, and only if all candidate CI gates pass. Promotion should use a fresh release line rather than rewriting `v1.0.2`.
