# Security and trust boundaries

ForkRoom is a challenge demonstration of safe browser-local human-agent collaboration. This document states what it protects, what it does not protect, and which properties are actually enforced.

## Security objective

The primary security property is **decision authority integrity**:

> An agent may inspect, analyze, navigate, and stage bounded proposals, but it must not silently change canonical decision inputs or approve its own proposal.

A secondary objective is **semantic input integrity**:

> Every WebMCP invocation is validated independently of its advertised JSON Schema before domain logic executes.

ForkRoom does not claim to provide confidential multi-user storage, cryptographic non-repudiation, or a trusted execution environment.

## Trust model

| Component or data | Trust status | Treatment |
| --- | --- | --- |
| Human approval/rejection click | Authoritative for this browser session | May admit or reject a pending proposal. |
| Human-edited weights, scores, probabilities | Authoritative normative input | Clamped, normalized, persisted, and logged. |
| Agent tool input | Untrusted | Closed schema plus runtime type, length, range, enum, and ID validation. |
| Workspace text and imported evidence | Untrusted data | Never treated as executable instruction; result payload carries an untrusted-data notice. |
| Model score | Derived decision aid | Never represented as fact, causal effect, or guaranteed outcome. |
| Browser local storage | Convenience persistence | Namespaced and versioned, but not confidential or tamper-proof. |
| Preview-host origin | Untrusted shared hosting context | Use the seeded demo only; do not enter confidential data. |
| Source and CI results | Public evidence | Reproducible, but not a formal proof of all browser implementations. |

## Authority boundary

### Agent capabilities

The registered surface has exactly three modes:

- **Read**: side-effect-free inspection and deterministic analysis.
- **Navigation**: changes visible focus only; does not increment model revision.
- **Proposal**: creates a `pending` proposal and returns an explicit approval receipt.

### Capabilities intentionally absent

There is no WebMCP tool for:

- approving a proposal;
- rejecting a proposal;
- directly changing criterion weights;
- directly changing option scores;
- directly changing future probabilities;
- directly setting a commitment;
- importing arbitrary state;
- resetting or deleting the workspace.

Those operations remain human-interface actions.

### Enforced transition

Let `S` be canonical decision state and `P` the pending-proposal ledger. A proposal tool may perform:

\[
(S,P)\rightarrow(S,P\cup\{p\}),
\]

but not:

\[
(S,P)\rightarrow(S',P)
\]

for a substantive change `S' ≠ S`.

Only the reducer action `review-proposal` with human status `approved` calls the proposal application logic.

## Input validation

Every tool definition uses a root object schema with `additionalProperties: false`. Execution then repeats validation in code:

- root must be a non-array object;
- unknown fields are rejected;
- strings are trimmed and length-bounded;
- numbers must be finite and inside declared ranges;
- integer fields must be integers;
- enums are checked against closed value sets;
- arrays have minimum and maximum lengths;
- nested array entries reject unknown fields;
- option, criterion, future, and assumption IDs must exist in current state;
- duplicate comparison IDs are rejected;
- dependent field pairs are enforced for stress tests;
- cancellation is checked before and after handler execution.

The JSON Schema improves agent planning. Runtime validation remains the enforcement layer.

## Stale-state protection

Tools are registered once, but their handlers do not close over an obsolete snapshot. The bridge reads `stateRef.current` at invocation time. Human changes made after registration are therefore visible to the next tool call.

## Prompt-injection posture

User-authored question, context, option, evidence, and assumption text can contain arbitrary strings. ForkRoom addresses this at the application boundary:

- user content is not interpolated into tool names or descriptions;
- tool metadata is static;
- results identify workspace fields as untrusted data;
- agent proposals remain outside canonical state;
- a human sees the rationale and structured payload before approval;
- imported content does not execute as code;
- React text rendering escapes HTML by default;
- the application contains no `dangerouslySetInnerHTML` path for workspace content.

A browser agent must still follow its own prompt-injection defenses. ForkRoom reduces the consequence of a malicious workspace string by withholding approval authority.

## Persistence and import

The challenge build stores state in `localStorage` under `forkroom:webmcp:decision:v1`.

Protections:

- versioned root object;
- conservative structural import gate;
- bounded undo history;
- storage failures are caught;
- imported JSON is rendered as data.

Limitations:

- local storage can be modified by a user or any script on the same origin;
- the structural import check is not a full deep schema validator;
- preview services can use a shared origin;
- no encryption or server-side revision authority exists.

Therefore the public preview is for the seeded challenge scenario, not confidential decisions.

## Deployment and supply-chain posture

- `package-lock.json` is committed.
- CI uses `npm ci` rather than floating installation.
- The project has only two runtime dependencies: React and React DOM.
- GitHub Actions reruns the WebMCP contract audit, lint, tests, and production build.
- The live publisher repeats those checks rather than trusting a prior job.
- The standalone builder parses embedded JavaScript before publication.
- The runtime smoke test boots the emitted standalone document and requires all 16 tools.
- The `live` branch contains a `SOURCE_COMMIT` receipt linking it to main.
- Publication occurs only after all gates pass.

The GitHub Actions are referenced by major release tags for practicality under the challenge deadline. A longer-lived production project should pin each third-party action to a reviewed commit SHA.

## Security headers

The Vite preview and Vercel configuration request:

- `Origin-Agent-Cluster: ?1`;
- `Permissions-Policy: tools=(self)`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: SAMEORIGIN` in the Vercel configuration.

Third-party preview services control their own response headers, so these headers are not claimed for every challenge preview URL.

## Numerical integrity

The analysis engine clamps outputs to `[0,100]`, normalizes weights and probabilities, handles all-zero vectors with equal shares, direction-normalizes cost criteria, and exposes penalties rather than hiding them.

It does **not** claim:

- statistical calibration;
- causal identification;
- independent assumptions;
- a globally optimal decision;
- exhaustive sensitivity over all joint perturbations.

The interface and tool results state these limitations to reduce automation bias.

## Abuse cases reviewed

| Abuse or failure mode | Control |
| --- | --- |
| Agent supplies unknown fields to smuggle data | Root and nested unknown-field rejection. |
| Agent references a fabricated entity ID | Current-state entity lookup fails before mutation. |
| Agent asks to approve its own proposal | No such tool is registered. |
| Agent claims a score is a fact | Tool and UI uncertainty notices state the model boundary. |
| Agent runs a what-if that accidentally edits state | Stress testing clones state and returns deltas only. |
| Registered handler reads old state | Invocation-time state reference. |
| Proposal is applied while being staged | Reducer tests prove option/model counts are unchanged before approval. |
| Rejected proposal changes model | Reducer test proves no application. |
| Standalone artifact is malformed | VM syntax parse plus executable JSDOM boot gate. |
| Deployment diverges from source | `SOURCE_COMMIT` receipt on live branch. |
| Unbounded event growth degrades browser | Proposal, activity, invocation, and history collections are capped. |

## Residual risks

- A compromised browser or malicious extension can alter any browser-local application.
- A user can manually edit local storage or source code.
- Shared preview origins are unsuitable for secrets.
- Human approval can still be mistaken or inattentive; visibility is not infallibility.
- An agent may generate persuasive but weak rationale; approval remains a judgment, not a cryptographic endorsement.
- Model inputs may be biased, incomplete, or strategically chosen.
- Tool annotations are advisory to the host; runtime validation and the missing approval capability provide the stronger boundary.

## Production hardening path

For real organizational deployment:

1. Serve ForkRoom from a dedicated first-party origin.
2. Add authenticated workspaces and role-based authority.
3. Persist an append-only server-side event log with optimistic revision checks.
4. Deep-validate imported snapshots against a versioned schema.
5. Attach provenance and freshness metadata to evidence.
6. Sign release artifacts and decision receipts.
7. Add rate limits, abuse telemetry, CSP, SRI, and dependency scanning.
8. Run browser-native WebMCP conformance tests in each supported host.
9. Add independent accessibility and security review.

## Reporting

This repository was built for a time-bounded challenge. Security defects can be reported through a GitHub issue without including confidential decision data. For a sensitive report, contact the repository owner privately rather than publishing exploit details.
