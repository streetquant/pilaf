# Adversarial review

This document records material failure modes actively sought during the challenge build, including defects that were found rather than merely hypothetical risks.

## Review method

ForkRoom was reviewed against five questions:

1. Can the agent gain authority the product says it does not have?
2. Can stale, malformed, or adversarial input bypass the advertised contract?
3. Can the analytical model create false confidence or hide decisive assumptions?
4. Can the judge-facing build differ from the source or silently fail at runtime?
5. Can the interface become unusable outside the primary desktop path?

For each issue, the team attempted to construct a counterexample, added a control, and—where practical—added a repeatable verification gate.

## Findings and resolutions

### AR-01 · Agent self-approval

**Attack:** Stage a proposal and then invoke another tool to admit it without a person.

**Finding:** The initial product concept could have treated “apply proposal” as another useful agent tool, which would make the approval interface cosmetic.

**Resolution:** The WebMCP surface exposes proposal creation but no review action. Proposal application is reachable only through the human UI reducer action. Static contract audit searches for an approval tool, protocol tests inspect the registered names, and reducer tests prove staging alone leaves canonical state unchanged.

**Status:** Closed; structurally enforced.

### AR-02 · Stale registration closure

**Attack:** Change a criterion weight after tools register, then ask the agent to inspect the decision. A handler closed over the initial state would return a plausible but obsolete model.

**Resolution:** `App.tsx` maintains `stateRef.current`; every invocation reads current state through the bridge. Tool definitions remain stable while data is resolved at execution time.

**Status:** Closed; architecture-level control.

### AR-03 · JSON Schema as documentation only

**Attack:** Call handlers programmatically with unknown fields, invalid IDs, non-finite numbers, oversized text, or malformed nested arrays, bypassing host-side schema enforcement.

**Resolution:** Every handler independently verifies the root object, rejects unknown fields, enforces type/range/length/enum constraints, and resolves IDs against current state. Protocol tests exercise unknown-field and fabricated-ID rejection.

**Status:** Closed for registered input paths.

### AR-04 · What-if mutates reality

**Attack:** A stress test reweights futures in canonical state even though it is described as side-effect-free.

**Resolution:** Stress testing operates on a structured clone, computes baseline and hypothetical analyses separately, and returns deltas. No reducer action is dispatched.

**Status:** Closed by implementation; covered indirectly by protocol behavior.

### AR-05 · Proposal payload is applied during staging

**Attack:** Use `forkroom_propose_option` and observe the new option in the ranking before approval.

**Resolution:** `add-proposal` only adds to the bounded proposal ledger. `applyProposal` is called exclusively inside `review-proposal` when status is `approved`. Tests assert option count is unchanged after staging and increases only after approval.

**Status:** Closed; tested.

### AR-06 · Rejected proposal has side effects

**Attack:** Reject an option, criterion, or assumption challenge but retain some payload effect.

**Resolution:** Rejection only marks proposal status and records activity. Reducer tests prove criterion count and assumption fields remain unchanged.

**Status:** Closed; tested.

### AR-07 · Normalization breaks under boundary inputs

**Attack:** Set one weight/probability to 100, all values to zero, or enter values outside `[0,100]`.

**Resolution:** Inputs are clamped. Redistribution preserves total 100. The analysis normalizer assigns equal shares when the positive total is zero. Tests recompute totals and exercise clamping.

**Status:** Closed for supported edit operations.

### AR-08 · Cost criterion ranks backward

**Attack:** Add a cost criterion and reward the option with the highest cost.

**Resolution:** Cost criteria are transformed as `100 - rawScore` before aggregation. A focused test with a cheap and expensive option proves the cheaper option wins.

**Status:** Closed; tested.

### AR-09 · Caution accidentally rewards uncertainty

**Attack:** Increase human uncertainty aversion and observe an uncertain option’s score rise.

**Resolution:** Caution multiplies only nonnegative assumption and dispersion penalties. A test compares every option at caution 0 and 1 and requires the high-caution score not to exceed the low-caution score.

**Status:** Closed; tested.

### AR-10 · Model output masquerades as causal truth

**Attack:** Treat the leading robust score as a factual outcome forecast or optimization proof.

**Resolution:** The UI and every tool result identify scores as browser-local structured judgments, not verified facts. The method note defines what is and is not estimated. Penalty components, worst case, regret, confidence, and sensitivity are shown rather than collapsing uncertainty into one unexplained number.

**Status:** Mitigated; ultimately depends on human and agent interpretation.

### AR-11 · DOM injection through workspace strings

**Attack:** Import HTML/script content in an option, assumption, or rationale.

**Resolution:** Workspace content is rendered through React text nodes, not `dangerouslySetInnerHTML`. Dynamic content is absent from static tool metadata and is labelled untrusted in tool results.

**Status:** Mitigated for current render paths.

### AR-12 · Unbounded browser growth

**Attack:** Repeatedly invoke tools and stage proposals until the page degrades.

**Resolution:** Proposals, activity entries, tool invocations, and undo snapshots are capped. The decision model itself is bounded by tool input-array limits.

**Status:** Mitigated; deliberate denial-of-service in a compromised local page remains possible.

### AR-13 · UI tests assert the wrong accessible name

**Attack/failure:** The first CI suite used visual spacing in regular expressions, but accessible names concatenate nested text and shortcut labels without those spaces.

**Observed result:** Three UI tests failed in the first remote workflow despite domain and protocol tests passing.

**Resolution:** Assertions were aligned with actual accessible names and ambiguous text was checked with an all-elements query. The corrected CI passed all 26 tests.

**Lesson:** Accessibility-tree behavior must be tested as rendered, not inferred from visual layout.

**Status:** Closed; CI evidence retained in workflow history.

### AR-14 · GitHub Pages workflow could not enable Pages

**Failure:** The build and verification stages passed, but the repository had no Pages site configured. The workflow token could not create one and returned `Resource not accessible by integration`.

**Resolution:** The failing workflow was removed rather than leaving a red check. A separate publisher now verifies the complete artifact and publishes it to a minimal orphan `live` branch. The build is viewable through an HTML preview endpoint and can later be moved to any dedicated static host without source changes.

**Status:** Closed for challenge delivery; dedicated-origin deployment remains recommended.

### AR-15 · Orphan-branch publisher failed on an empty index

**Failure:** After `git switch --orphan live`, `git rm -rf .` returned nonzero because Git had already produced an empty index.

**Resolution:** Removed the redundant command. The next workflow completed and published the live branch.

**Status:** Closed; subsequent run passed.

### AR-16 · Standalone bundler corrupted JavaScript

**Attack/failure:** The first standalone builder passed the entire minified JavaScript bundle as a `String.replace` replacement string. `$` sequences inside minified React code were interpreted as replacement tokens and injected matched HTML into the bundle.

**Observed result:** Superficial presence checks passed, but inspection showed duplicated HTML inside JavaScript.

**Resolution:** Dynamic replacements now use replacer functions, which preserve bundle bytes. The resulting script is parsed with `node:vm.Script`, and the document must contain exactly one doctype.

**Lesson:** A text-containing build artifact must be parsed or executed; string-presence checks are not sufficient.

**Status:** Closed; syntax-gated.

### AR-17 · Standalone script ran before the DOM root

**Failure:** The inlined script inherited Vite’s original `<head>` position but lost `type="module"` defer semantics. JSDOM correctly executed it synchronously before `<div id="root">`, causing `ForkRoom could not find its application root.`

**Resolution:** The standalone builder removes the head entry and inserts an ordinary script immediately before `</body>`. It statically asserts root-before-script ordering. The deployment workflow then boots the artifact in JSDOM and requires the application shell, decision map, all 16 tools, and zero runtime errors.

**Status:** Closed; executable deployment gate passed.

### AR-18 · Live bytes drift from reviewed source

**Attack:** A generated branch or preview contains old or unreviewed code.

**Resolution:** The live publisher starts from the triggering main commit, rebuilds from lockfile, verifies the artifact, and writes that exact SHA to `SOURCE_COMMIT`. The current deployed receipt is checked after publication.

**Status:** Closed for the automated publisher.

### AR-19 · Mobile horizontal overflow

**Attack/failure:** Dense map, matrix, future cards, and a three-column shell can exceed a narrow viewport.

**Resolution:** Responsive breakpoints convert the left navigation into a compact top strip, stack the agent rail, make matrix/future controls horizontally scrollable where appropriate, collapse inspectors, and reduce modal geometry. Browser automation measured zero document-level horizontal overflow at 390 px and captured the mobile surface.

**Status:** Closed for tested seed state and viewport.

### AR-20 · Preview-origin confidentiality

**Attack:** Enter sensitive data in a challenge preview hosted on a shared third-party origin.

**Finding:** A source-preview service is useful for public judging but is not an appropriate security boundary for confidential data or durable production state.

**Resolution:** The challenge workspace is seeded, needs no secrets, and documentation explicitly prohibits confidential use. State is namespaced, but a dedicated first-party origin remains a production requirement.

**Status:** Accepted challenge limitation; clearly disclosed.

### AR-21 · Browser API location drift

**Attack/failure:** A judge opens ForkRoom in an earlier Chromium origin-trial or challenge-browser build that still exposes `navigator.modelContext`; the UI works, but no native tools register because the app probes only the newer document-scoped API.

**Resolution:** Registration now resolves `document.modelContext ?? navigator.modelContext`, preserving the current API while supporting the deprecated location. A protocol test requires all 16 tools through the legacy-only path, and the static contract audit verifies the current-first ordering.

**Status:** Closed; tested.

### AR-22 · Stale proposal after human edits

**Attack/failure:** An agent inspects revision `r`, a human then changes a value or another proposal is staged, and the agent submits a structurally valid proposal based on obsolete assumptions.

**Resolution in post-judging candidate:** Every proposal tool requires `expected_revision`. The runtime rejects any value unequal to the current revision before staging and instructs the agent to inspect again. Accepted proposals retain `basedOnRevision` provenance. A protocol test proves stale calls create no proposal and do not increment revision.

**Status:** Closed in `v1.1.0-post.1`; not part of the frozen `v1.0.2` judged artifact.

### AR-23 · Shallow imported-snapshot validation

**Attack/failure:** A snapshot passes a few root-type checks while containing duplicate IDs, dangling references, invalid score maps, oversized proposal payloads, contradictory review states, or hidden fields.

**Resolution in post-judging candidate:** Import and storage recovery use a deep bounded validator covering root/entity fields, identifiers, relationships, proposal payloads, provenance, and state consistency. Eight focused tests exercise valid and adversarial snapshots.

**Status:** Closed in `v1.1.0-post.1`; not part of the frozen `v1.0.2` judged artifact.

## Remaining model criticism

### Alternative ontology

ForkRoom models criteria, futures, and assumptions as distinct. Some decisions need causal graphs, constraints with hard feasibility solvers, multiple stakeholder utility functions, or sequential control policies. Collapsing those into this ontology could hide structure.

### Correlated uncertainty

Assumption penalties are aggregated independently. Correlation among assumptions can make total risk higher or lower than the displayed additive penalty.

### Sensitivity scope

The rank-reversal screen varies one weight at a time by a fixed amount. Joint perturbations, discontinuities, and feasibility boundaries can produce reversals that this local screen misses.

### Score provenance

The challenge demo uses seeded judgment scores. A real decision should attach source, date, owner, measurement method, and uncertainty to each score.

### Human approval quality

A visible approval gate prevents silent authority transfer but does not guarantee careful review. Production use should support separation of duties, mandatory rationale, and high-impact dual approval.

### Optimization framing

A high model score is not equivalent to a real-world optimum. The feasible option set may omit a superior alternative, and the objective may omit affected values. ForkRoom’s agent tools are intended to challenge both, not certify completeness.

## Release decision

The challenge release is considered ready when all of the following hold simultaneously:

- 16-tool contract audit passes;
- lint reports zero warnings and errors;
- all 26 deterministic tests pass;
- production build completes;
- portable asset checks pass;
- standalone JavaScript parses;
- standalone document contains one HTML document and root-before-script order;
- standalone runtime boots and discovers exactly 16 tools;
- publication succeeds;
- `live/SOURCE_COMMIT` matches the triggering main commit;
- demo video decodes fully and remains under three minutes;
- repository documentation states residual risks and model limits.

At application commit `27feefffa5e88e83aa256af96e1cb37453bfcc94`, the Judge demo itself was upgraded to execute the real WebMCP handlers, and a 25th integration test proved the resulting challenge remains pending. Final release commits remain acceptable only when the unchanged verification and publication workflows both pass.
