# Demo script and judge prompts

> **Frozen competition collateral:** this document describes the official `v1.0.2` challenge entry. Post-judging candidate changes are documented separately and must not be substituted during judging.

## Final video

- Runtime: approximately 50 seconds
- Format: 1536×960 H.264 video, AAC narration, burned-in captions
- Full-quality file: `ForkRoom-WebMCP-Demo.mp4`
- SHA-256: `233668d5e39bf13e2107cbecddfe1f95c780e9e7b7aed3992d74d4667172e668`
- Drive mirror: https://drive.google.com/file/d/1SHYTAq-y0NPZjoi5L30PPboSveiUsm_2/view

The video contains only the project interface, original title/outro cards, generated narration, and an original low-volume ambient bed. No third-party footage or music is used.

## 50-second narration

> Hard decisions do not fit in a chat. ForkRoom turns the page into a shared decision world. The human owns values, uncertainty tolerance, and final authority. Through sixteen typed WebMCP tools, an agent can inspect the live model, compare options, stress-test futures, and expose rank reversals—without guessing through the DOM. Here, the human increases Equity. The entire ranking recomputes. The agent then finds a fragile funding assumption and stages a structured challenge. Notice what does not happen: the model is unchanged. ForkRoom withholds approval from every agent tool. The person sees the rationale, counterexample, and proposed confidence change, then explicitly approves or rejects it. The accepted change enters the ledger, updates the model, and remains undoable. This is not a chatbot next to a dashboard. It is visible, reversible human-agent deliberation through WebMCP.

## Visual timeline

| Time | Visual | Message |
| --- | --- | --- |
| 0:00–0:04 | ForkRoom title card | “See the future before you choose it.” |
| 0:04–0:09 | Decision Map | Human and agent share one structured decision world. |
| 0:09–0:15 | Protocol lens | Sixteen typed site tools; no DOM guessing. |
| 0:15–0:22 | Matrix | Human raises Equity; ranking recomputes. |
| 0:22–0:29 | Futures | Scenario survival, downside, and sensitivity are visible. |
| 0:29–0:36 | Guided agent demo | Agent locates a fragile matching-funds assumption. |
| 0:36–0:43 | Audit approval card | Proposal is staged; canonical model remains unchanged. |
| 0:43–0:47 | Human approves | Challenge enters model and ledger after explicit approval. |
| 0:47–0:50 | Outro | “Agent insight. Human authority. One live page.” |

## Live judge walkthrough

### Fast path: 45–60 seconds

1. Open the self-contained preview:
   `https://htmlpreview.github.io/?https://github.com/streetquant/forkroom-webmcp/blob/live/standalone.html`
2. Click **Judge demo**.
3. ForkRoom moves to Futures, stages a challenge to the matching-funds assumption, and hands focus to Audit.
4. Expand **Inspect structured change**.
5. Confirm that the proposal is pending and the current model is untouched.
6. Click **Approve** or **Reject**.
7. Open the Protocol lens from **16 tools ready**.

### Deep path: three minutes

1. In **Map**, note the current leader, lead size, model temperature, human caution, worst-case score, and highest-leverage uncertainty.
2. In **Matrix**, move the Equity weight to 40%. ForkRoom redistributes all other weights so the total remains 100%.
3. Edit one option score and observe attribution in Audit.
4. In **Futures**, raise the outage probability. The other probabilities are redistributed to preserve 100%.
5. Inspect the survival curves, robust leaderboard, and any rank-reversal cards.
6. Open the **Protocol lens** and compare read, navigation, and proposal modes.
7. Run an agent prompt below in a WebMCP-capable browser.
8. Inspect the resulting proposal ID, rationale, and structured payload.
9. Approve or reject it as the human decision owner.
10. Export the versioned snapshot or use Undo.

## Judge prompts

### Prompt 1 · Expose the hidden dependency

```text
Inspect the current ForkRoom decision at analysis detail. Find the single most fragile assumption. Explain why it matters, identify the options most exposed to it, and stage one concrete assumption challenge with a revised confidence and the smallest reversible evidence test. Do not approve anything.
```

Expected tool journey:

1. `forkroom_inspect_decision`
2. `forkroom_find_fragile_assumptions`
3. optionally `forkroom_inspect_option`
4. `forkroom_challenge_assumption`

Expected outcome: a visible pending proposal with no canonical model change.

### Prompt 2 · Find the value disagreement

```text
Inspect this decision, compare Cooling Commons and Home Shield, and find a criterion-weight change that could reverse their ranking. Explain the competing human values without choosing for me. Then focus the Matrix view so I can decide whether the weight should change.
```

Expected tool journey:

1. `forkroom_inspect_decision`
2. `forkroom_compare_options`
3. `forkroom_find_rank_reversals`
4. `forkroom_focus_view`

Expected outcome: analysis plus presentation-only navigation; model revision remains unchanged.

### Prompt 3 · Test a harsher future

```text
Inspect the current future IDs. Run a side-effect-free stress test in which the heatwave-plus-grid-outage future has 55% probability and human caution is 0.85. Report score deltas, whether the leader changes, and the option with the strongest worst-case performance. Do not edit the workspace.
```

Expected tool journey:

1. `forkroom_inspect_decision`
2. `forkroom_run_stress_test`
3. optionally `forkroom_inspect_option`

Expected outcome: hypothetical deltas only; canonical future probabilities remain unchanged.

### Prompt 4 · Expand the option set

```text
Inspect the complete model and propose exactly one fifth option that is genuinely distinct from all four existing portfolios. Give conservative initial scores, future impacts, and assumption exposures using only valid IDs. Explain what the option sacrifices. Leave it pending for human review.
```

Expected tool journey:

1. `forkroom_inspect_decision` with `detail="model"`
2. `forkroom_propose_option`

Expected outcome: one pending option proposal; the ranked option count stays four until approval.

### Prompt 5 · Draft a reversible decision

```text
Inspect the analysis and identify the current leader. Draft—not approve—a commitment for that option with at least three measurable guardrails, a stop or adapt trigger, and a specific review milestone after the first implementation checkpoint. Preserve the human’s final authority.
```

Expected tool journey:

1. `forkroom_inspect_decision`
2. `forkroom_find_next_uncertainty`
3. `forkroom_draft_commitment`

Expected outcome: a pending commitment proposal. The visible commitment banner appears only after human approval.

## Development-console demonstration

A normal browser without the experimental WebMCP host can inspect the identical tool definitions:

```js
window.__FORKROOM_DEVTOOLS__.listTools()
```

Read current analysis:

```js
JSON.parse(
  await window.__FORKROOM_DEVTOOLS__.execute(
    'forkroom_inspect_decision',
    { detail: 'analysis' },
  ),
)
```

Run a side-effect-free stress test:

```js
JSON.parse(
  await window.__FORKROOM_DEVTOOLS__.execute(
    'forkroom_run_stress_test',
    {
      future_id: 'outage',
      future_probability: 55,
      caution: 0.85,
    },
  ),
)
```

Stage a challenge:

```js
JSON.parse(
  await window.__FORKROOM_DEVTOOLS__.execute(
    'forkroom_challenge_assumption',
    {
      assumption_id: 'matching',
      counterpoint: 'Comparable award cycles slipped past construction invoice dates.',
      revised_confidence: 28,
      test: 'Require a written disbursement milestone and pre-authorize a no-match fallback.',
      rationale: 'Funding timing is both uncertain and highly consequential for the infrastructure option.',
    },
  ),
)
```

There is intentionally no development or WebMCP method to approve the resulting proposal. Approval remains a visible human action.

## Recording notes

For a replacement recording:

- use a fresh/incognito browser profile so the seed workspace is clean;
- use a 16:10 or 16:9 viewport at 1440 px or wider;
- keep browser zoom at 100%;
- open the Protocol lens early so WebMCP is unmistakable;
- demonstrate one read/analysis capability and one proposal capability;
- show the pending state before approval;
- keep final runtime below three minutes;
- never claim that seeded scores are factual forecasts;
- end on the post-approval Audit or Map view, not on a console.
