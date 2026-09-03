# ForkRoom execution plan

## Product thesis

ForkRoom is a live decision multiverse for choices that cannot fit in a chat. A human supplies values, constraints, and authority. An agent expands the option space, challenges assumptions, and stress-tests alternative futures through narrowly scoped WebMCP tools. Every agent-authored substantive mutation is staged in the visible page, attributable, selectively approvable, rejectable, and reversible.

## Delivery status

| Milestone | Status | Evidence |
| --- | --- | --- |
| Decision ontology, analysis engine, and seeded scenario | Complete | `src/domain/`; deterministic analysis tests |
| Responsive human interface | Complete | Map, Matrix, Futures, Audit; desktop/mobile screenshots |
| Imperative WebMCP tool surface | Complete | 16 tools in `src/webmcp/protocol.ts` |
| Human approval boundary | Complete | No approval tool; reducer and protocol tests |
| Persistence, undo, import/export, guided demo | Complete | Product integration tests and recorded walkthrough |
| Static and runtime verification | Complete | Contract audit, 35 tests across five files, lint, build |
| Portable deployment | Complete | Verified `live` branch with `SOURCE_COMMIT` receipt |
| Self-contained judge artifact | Complete | VM syntax parse and executable JSDOM boot gate |
| Adversarial review | Complete | `docs/ADVERSARIAL_REVIEW.md` |
| Demo video | Complete | 49.77-second narrated and captioned MP4 |
| Submission package | Complete | README plus architecture, security, verification, judge, demo, and submission docs |
| Entrant submission | Human-only | Paste/upload in Devpost and accept personal/legal declarations |

## Judging strategy

| Criterion | Product evidence |
| --- | --- |
| Usefulness | Exposes why a choice leads, what would reverse it, which assumption deserves evidence, and how to commit reversibly. |
| Originality | The browser becomes a branchable decision world with asymmetric human and agent capabilities—not a chatbot beside a dashboard. |
| Execution | Complete local-first application, polished responsive UI, persistence, undo, audit, import/export, tests, live artifact, video, and documentation. |
| Thoughtful WebMCP use | Sixteen narrow semantic tools with closed schemas, runtime validation, annotations, abortable lifecycle, current-state reads, and explicit proposal receipts. |
| Human-agent experience | Agent performs high-scale inspection and challenge; human owns values, uncertainty tolerance, approval, and commitment in one visible state. |

## Analytical model

For option `i`, criterion `j`, future `s`, and assumption `a`:

- `w_j` is the normalized criterion weight.
- `x_ij` is the option score on the criterion, direction-normalized to `[0,100]`.
- `p_s` is the normalized future probability.
- `m_is` is the future impact on the option.
- `c_a` is confidence in an assumption.
- `e_ia` is the option's exposure to the assumption.
- `q_a` is the assumption's decision impact.

The base value is:

`B_i = Σ_j w_j x_ij`.

The expected future adjustment is:

`M_i = Σ_s p_s m_is`.

The scaled assumption penalty is:

`A_i = 18 Σ_a (1-c_a) q_a |e_ia|`.

The future-impact dispersion `σ_i` measures option instability across defined futures.

The displayed robust score is:

`R_i = clamp(B_i + M_i - ρ(A_i + 0.75σ_i), 0, 100)`

where `ρ ∈ [0,1]` is controlled by the human's caution slider. ForkRoom also computes worst-case score, regret, assumption fragility, and one-at-a-time criterion sensitivity. These are decision aids, not claims of causal truth or global optimality.

## Hard gates

- [x] Public repository with MIT license.
- [x] Working live artifact requiring no account or API key.
- [x] Real `document.modelContext.registerTool(...)` implementation with a deprecated `navigator.modelContext` compatibility fallback.
- [x] Exactly 16 unique imperative tools.
- [x] All agent-authored substantive changes require explicit human approval.
- [x] No WebMCP self-approval or rejection capability.
- [x] Tool inputs use closed JSON Schemas and independent runtime validation.
- [x] Read-only tools declare `readOnlyHint`.
- [x] Workspace output is identified as untrusted data.
- [x] Model outputs state their uncertainty and non-causal boundary.
- [x] Production build, tests, lint, and deployment gates pass.
- [x] Self-contained artifact is parsed and booted before publication.
- [x] Desktop and mobile browser acceptance checks pass for the seed scenario.
- [x] Demo video remains below three minutes and decodes fully.
- [x] Architecture, threat model, adversarial review, verification, and submission copy are public.

## Final entrant actions

1. Open the live URL in an incognito browser and perform the Judge demo once.
2. Upload `ForkRoom-WebMCP-Demo.mp4` directly to the Devpost project.
3. Paste the fields from `docs/SUBMISSION.md`.
4. Confirm the public repository and live links.
5. Accept the entrant and legal declarations personally.
6. Submit before September 3, 2026 at 1:00 p.m. PT.

No further product feature should be merged before submission unless it fixes a decision-critical defect and passes every unchanged gate.


## Post-judging candidate gate

The isolated `v1.1.0-post.1` candidate is promotable only after judging or explicit organizer permission, and only when its independent CI proves all 35 tests, lint, build, standalone boot, stale-revision rejection, receipt semantics, and deep snapshot validation. The frozen `v1.0.2` entry remains unchanged.
