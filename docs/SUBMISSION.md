# WebMCP Challenge submission

> **Frozen competition collateral:** this document describes the official `v1.0.2` challenge entry. Post-judging candidate changes are documented separately and must not be substituted during judging.

This file is paste-ready for the OpenAI WebMCP Challenge submission form. It uses only claims supported by the repository, CI, deployed artifact, and recorded demo.

## Canonical links

- **Project:** ForkRoom
- **Live app:** https://htmlpreview.github.io/?https://github.com/streetquant/forkroom-webmcp/blob/live/standalone.html
- **Live fallback:** https://raw.githack.com/streetquant/forkroom-webmcp/live/index.html
- **Source code:** https://github.com/streetquant/forkroom-webmcp
- **Demo video:** https://drive.google.com/file/d/1SHYTAq-y0NPZjoi5L30PPboSveiUsm_2/view
- **WebMCP catalogue:** https://github.com/streetquant/forkroom-webmcp/blob/live/.well-known/webmcp.json
- **Verification:** https://github.com/streetquant/forkroom-webmcp/blob/main/docs/VERIFICATION.md
- **Architecture:** https://github.com/streetquant/forkroom-webmcp/blob/main/docs/ARCHITECTURE.md

For the strongest submission, upload the supplied `ForkRoom-WebMCP-Demo.mp4` directly to Devpost rather than relying only on the Drive mirror.

## Project name

**ForkRoom**

## Tagline

**See the future before you choose it.**

Alternative technical tagline:

**A live decision multiverse for visible, reversible human-agent deliberation.**

## 50-word description

ForkRoom turns consequential choices into a shared, branchable decision world. Humans own values, uncertainty tolerance, approval, and commitment. Agents use 16 typed WebMCP tools to inspect the live model, compare alternatives, stress-test futures, expose fragile assumptions, and stage structured changes—without DOM guessing or silent authority transfer.

## 100-word description

ForkRoom is a live decision multiverse for choices too consequential to collapse into one chat response. A human defines values, uncertainty tolerance, constraints, and final authority. A browser agent receives 16 narrow WebMCP tools over the same visible state: it can inspect the model, compare options, run side-effect-free stress tests, find fragile assumptions and rank reversals, navigate the interface, and stage structured proposals. It cannot approve its own work. Every substantive agent change waits in a visible Audit view for human approval or rejection and remains undoable. The result is genuine human-agent deliberation rather than chat beside a dashboard.

## Full project description

Hard decisions are rarely “fill this form” tasks. They contain competing values, incomplete options, uncertain assumptions, plausible futures, disagreement, and authority. A chat transcript hides that structure; traditional browser automation guesses through the interface and treats every action as another click.

ForkRoom makes the browser page itself a shared decision world.

The challenge demo asks how Harbor City should allocate a $12M heat-resilience budget before the 2027 season. Four portfolios are evaluated across five human values, three possible futures, and four explicit assumptions. The interface exposes the current ranking, robust and worst-case scores, regret, future dispersion, fragile assumptions, and value-weight changes that reverse the leader.

WebMCP transforms the experience. Through 16 typed site tools, an agent can:

- inspect the current decision at summary, model, or analysis detail;
- decompose one option and compare alternatives;
- run side-effect-free future and caution counterfactuals;
- rank assumptions by uncertainty × impact × exposure;
- find criterion-weight perturbations that change the leader;
- identify the highest-value next uncertainty;
- navigate the visible Map, Matrix, Futures, or Audit view;
- stage a new option, value, assumption, future, score revision, assumption challenge, or reversible commitment.

The crucial creative boundary is what the agent cannot do: approve its own proposal. Proposal tools add a bounded, inspectable item to the pending ledger and return an approval receipt. Canonical decision state remains unchanged until the person reviews the rationale and payload and explicitly chooses Approve. Rejection has no model effect. Accepted changes are attributed, persisted, and undoable.

The human interface and the WebMCP tools share one browser-local domain model, analysis engine, and reducer. There is no separate mocked agent path. Tool handlers read current state at invocation time, use closed JSON Schemas plus independent runtime validation, reject unknown fields and fabricated IDs, support cancellation, annotate read-only and untrusted-content behavior, and state that model scores are decision aids rather than causal facts.

ForkRoom is local-first and needs no account, backend, API key, or paid service. It includes responsive desktop/mobile experiences, keyboard navigation, reduced-motion behavior, import/export, bounded undo, an audit ledger, a guided judge demo, public discovery metadata, a self-contained live artifact, and a deterministic verification pipeline.

## What problem does it solve?

Teams often use AI for consequential decisions in one of two weak modes:

1. **Chat-only advice:** reasoning, assumptions, alternatives, and revisions disappear into prose.
2. **Autonomous UI operation:** the agent clicks through controls without a semantic authority model.

ForkRoom preserves the complementary strengths of each participant:

- humans define what matters, how cautious to be, and what authority to grant;
- agents search the option space, perform repetitive counterfactual analysis, surface hidden dependencies, and challenge the current frame;
- the page keeps the shared state visible, attributable, reviewable, and reversible.

## Why is WebMCP essential?

WebMCP is not an integration ornament in ForkRoom; it is the product’s collaboration layer.

The decision state is richer than the DOM: “inspect without effect,” “run a hypothetical,” “move shared attention,” “stage a proposal,” and “approve a proposal” have different semantics and authority. An agent inferring those meanings from buttons and text would be slower, brittle, and unsafe.

ForkRoom exposes narrow task-level tools instead:

- read tools are explicitly side-effect-free;
- stress tests clone the state rather than editing it;
- navigation tools change presentation but not model revision;
- proposal tools produce a visible pending object and approval receipt;
- no tool grants self-approval.

Because both the human UI and tools call the same domain logic, the agent acts on the exact live model the person sees. The interaction becomes faster and more reliable while remaining human-governed.

## How it works

### Human loop

1. Read the decision map and uncertainty signal.
2. Adjust values, scores, future probabilities, or caution.
3. Inspect option survival and rank reversals.
4. Review agent proposals in Audit.
5. Approve or reject each change.
6. Export, undo, or approve a guarded commitment.

### Agent loop

1. Inspect current analysis.
2. Find the fragile assumption or value fault line.
3. Run a side-effect-free counterfactual.
4. Explain observed versus inferred claims.
5. Stage at most one high-leverage structured proposal.
6. Hand authority back to the human.

## Technical implementation

- React 19 and TypeScript
- Vite production build
- imperative `document.modelContext.registerTool(...)` integration with legacy `navigator.modelContext` fallback
- 16 closed-schema, runtime-validated WebMCP tools
- deterministic decision-analysis engine
- pure reducer as canonical state-transition boundary
- current-state bridge to avoid stale registered handlers
- versioned namespaced local storage
- bounded undo, proposal, activity, and invocation histories
- dependency-free SVG decision map and future chart
- responsive and accessible interface
- static WebMCP contract audit
- Vitest + Testing Library domain, protocol, authority, and product tests
- reproducible self-contained HTML build
- VM syntax validation and executable JSDOM boot/tool-discovery gate
- GitHub Actions verification and verified `live`-branch publication

## Decision model

For option `i`, ForkRoom computes:

```text
base value          B_i = Σ_j w_j x_ij
future adjustment   M_i = Σ_s p_s m_is
assumption penalty  A_i = 18 Σ_a (1-c_a) q_a |e_ia|
robust score         R_i = clamp(B_i + M_i - ρ(A_i + 0.75σ_i), 0, 100)
```

Here `ρ` is the human-controlled caution level. The application also reports worst-case score, regret, confidence, fragile assumptions, and criterion perturbations that reverse the leader. It explicitly does not present these seeded judgments as causal estimates or factual forecasts.

## WebMCP tool list

### Read-only

- `forkroom_inspect_decision`
- `forkroom_inspect_option`
- `forkroom_compare_options`
- `forkroom_find_fragile_assumptions`
- `forkroom_run_stress_test`
- `forkroom_find_rank_reversals`
- `forkroom_find_next_uncertainty`
- `forkroom_export_snapshot`

### Presentation-only

- `forkroom_focus_view`

### Human-reviewed proposal tools

- `forkroom_propose_option`
- `forkroom_propose_criterion`
- `forkroom_propose_assumption`
- `forkroom_propose_future`
- `forkroom_propose_score_change`
- `forkroom_challenge_assumption`
- `forkroom_draft_commitment`

## Safety and human control

ForkRoom enforces four rules:

1. **No silent mutation.** Every substantive agent change becomes a pending proposal.
2. **No self-approval.** The WebMCP surface does not expose approval or rejection.
3. **No schema trust shortcut.** Runtime code revalidates every invocation.
4. **No false certainty.** Tool results and UI distinguish model judgment from verified fact.

The Audit view makes proposal status, rationale, structured payload, tool activity, human review, and final commitment visible.

## Usefulness

ForkRoom’s pattern applies anywhere decisions combine quantitative comparison with normative human authority:

- public policy and capital allocation;
- climate resilience and infrastructure;
- product portfolio selection;
- procurement and vendor choice;
- research prioritization;
- incident response strategy;
- nonprofit grant allocation;
- organizational planning.

Its core value is not choosing automatically. It is helping people discover why a choice wins, what would reverse it, which assumption deserves evidence next, and how to commit reversibly.

## Originality

The browser becomes a **decision multiverse** rather than a document an agent edits or a workflow it completes. Humans and agents have different capabilities over one state:

- the human shapes the objective and controls admission;
- the agent branches, compares, challenges, and drafts;
- the page visualizes conditional futures and disagreement;
- the audit boundary prevents collaboration from collapsing into autonomy.

The creative unit is not the chatbot. It is the visible authority-preserving loop.

## Accomplishments

- Designed and shipped a complete browser-local decision system during the challenge window.
- Implemented 16 semantic WebMCP capabilities rather than DOM macros.
- Made proposal approval structurally unavailable to the agent.
- Built transparent robust scoring, downside, regret, fragility, and rank-reversal analysis.
- Created four polished, responsive decision views and a guided judge demo.
- Added import/export, persistence, undo, attribution, and commitment guardrails.
- Built a contract audit and 26 deterministic tests.
- Found and corrected real CI, deployment, string-substitution, and script-order defects.
- Added a self-contained artifact that CI must parse, boot, and inspect for all 16 tools before publishing.
- Produced a narrated, captioned, sub-one-minute demo video.

## Challenges encountered

### Preserving authority without crippling the agent

A proposal-only surface had to remain useful. The solution was to give the agent rich analytical and generative power while keeping one narrow capability—admission to canonical state—exclusively human.

### Avoiding stale browser state

WebMCP definitions are registered once, but the decision changes continuously. Handlers therefore read a current-state ref at invocation time rather than closing over registration-time state.

### Making experimental behavior testable everywhere

Most browsers do not expose WebMCP yet. ForkRoom publishes an identical development inspection surface so the same definitions and handlers can be deterministically tested, while compatible browsers receive native registration.

### Producing a truly portable live artifact

The ordinary Vite build was made path-relative. A self-contained build then uncovered two subtle defects: replacement-string interpolation corrupted minified JavaScript, and a non-module inline script executed before the DOM root. Both were fixed, and an executable boot/tool-discovery test now gates publication.

## What was learned

- Tool design is authority design: the safest capability is often the one deliberately absent.
- JSON Schema helps an agent plan, but runtime validation must enforce the boundary.
- Human-in-the-loop cannot mean a decorative confirmation after effects have occurred; the canonical transition must happen after review.
- Decision quality improves when an agent can challenge the objective and assumptions, not just optimize the current option list.
- A model should expose regret, downside, and rank reversals, not only a winner.
- Judge-facing artifacts must be executed, not merely built or searched for expected strings.

## What is next

A production ForkRoom would add:

- authenticated collaborative workspaces;
- multi-stakeholder value vectors and disagreement maps;
- evidence provenance and freshness;
- server-side revision checks and append-only events;
- role-based or dual approval for high-impact decisions;
- signed decision receipts;
- reusable templates for policy, procurement, product, and research decisions;
- a dedicated first-party origin and native WebMCP conformance matrix.

The challenge version keeps the system local-first so judges can evaluate the essential human-agent pattern without accounts, keys, or simulated infrastructure.

## 60-second judging instructions

1. Open the live app.
2. Click **Judge demo**.
3. In Audit, verify the agent’s challenge is pending and the model has not silently changed.
4. Approve or reject it.
5. Open **16 tools ready** to inspect the protocol lens.
6. Move a value or future probability and watch the model recompute.

## Recommended judge prompt

```text
Inspect the current ForkRoom decision at analysis detail. Find the single most fragile assumption, identify the options most exposed to it, run one side-effect-free counterfactual that could change the ranking, and stage one concrete assumption challenge with a revised confidence and reversible evidence test. Do not approve anything; hand the decision back to me in the Audit view.
```

## Verification summary

The published artifact is produced only after:

- 16-tool static contract audit;
- zero-warning lint;
- 26 passing deterministic tests;
- TypeScript and Vite production build;
- portable asset checks;
- standalone JavaScript syntax parse;
- standalone root/script-order checks;
- executable JSDOM boot;
- exactly 16 discovered tools;
- zero observed runtime errors;
- live-branch publication with a source-commit receipt.

Full evidence: [`docs/VERIFICATION.md`](./VERIFICATION.md)

## Submission checklist

- [x] Public source repository
- [x] Open-source license
- [x] Working application artifact
- [x] 16 imperative WebMCP tools
- [x] Human-agent collaboration central to the product
- [x] Visible human approval gate
- [x] Mobile-responsive interface
- [x] Demo video under three minutes
- [x] Reproducible verification suite
- [x] Architecture and security documentation
- [ ] Paste fields into Devpost
- [ ] Upload the supplied full-quality MP4 directly to Devpost
- [ ] Confirm the live link from an incognito browser
- [ ] Accept the entrant/legal declarations and submit before **September 3, 2026 at 1:00 p.m. PT**

The final four actions require the entrant’s Devpost session and personal declarations.
