# Verification evidence — frozen release and post-judging candidate

> **Evidence boundary:** the published `v1.0.2` release is the frozen challenge artifact. The `v1.1.0-post.1` figures below describe an isolated candidate and become verified only after the independent post-judging CI workflow passes.

This is a factual inventory of checks actually performed on ForkRoom. It distinguishes verified properties from assumptions and remaining uncertainty.

## Current evidence snapshot

| Item | Value |
| --- | --- |
| Protocol-driven application commit | `27feefffa5e88e83aa256af96e1cb37453bfcc94` |
| Live branch source receipt | Read `live/SOURCE_COMMIT`; publication rewrites it only after all gates pass. |
| Standard verification workflow | Latest **Verify ForkRoom** run must be green. |
| Verified live publication workflow | Latest **Publish live judge build** run must be green. |
| WebMCP tool count | 16 |
| Tool taxonomy | 8 read-only · 7 proposal · 1 navigation |
| Frozen v1.0.2 deterministic tests | 26 passed across 4 files |
| Post-judging candidate tests | 35 across 5 files; independently re-run before packaging |
| Lint | 0 warnings · 0 errors |
| Package audit during `npm ci` | 0 vulnerabilities reported by npm |
| Production JavaScript | approximately 275.67 kB / 84.33 kB gzip in verified build |
| Standalone artifact | built, syntax-parsed, booted, and tool-discovered |
| Desktop document overflow | 0 px in the recorded 1536×960 browser check |
| Mobile document overflow | 0 px at 390×844 in the recorded browser check |
| Demo video | 49.77 s · 1536×960 · H.264/AAC · full decode passed |
| Demo loudness | approximately −16.1 LUFS integrated |
| Demo SHA-256 | `233668d5e39bf13e2107cbecddfe1f95c780e9e7b7aed3992d74d4667172e668` |

Subsequent documentation-only commits must continue to pass the same workflows. The `live/SOURCE_COMMIT` file is the authoritative binding between deployed bytes and main-branch source.

## Verification layers

### 1. Static WebMCP contract audit

Command:

```bash
node scripts/validate-webmcp.mjs
```

The audit requires:

- exactly 16 imperative tools;
- unique tool names;
- names under a compact length ceiling;
- exactly 8 read-only tools;
- exactly 7 proposal tools;
- exactly 1 navigation tool;
- production use of `registerTool`;
- closed root object schemas;
- emitted `readOnlyHint` annotations;
- emitted `untrustedContentHint` annotations;
- explicit human-approval receipts for proposals;
- no tool name or capability that grants self-approval;
- abortable tool lifecycle;
- explicit TypeScript definitions for the experimental browser contract;
- a detectable open-source license.

The script prints every passed invariant and the full registered tool list.

### Cross-version API compatibility

ForkRoom resolves the browser endpoint as `document.modelContext ?? navigator.modelContext`. The current document-scoped API always wins when both exist. A focused protocol test removes the document endpoint, supplies only the legacy navigator endpoint, and requires all 16 tools plus a fully registered status. The static audit also checks the exact current-first fallback expression.

### 2. Domain analysis tests

File: `src/domain/analysis.test.ts`

Verified cases:

1. criterion and future normalization sum to one and do not mutate source state;
2. fixed-time analysis is deterministic;
3. complete ranking has unique options and consecutive ranks;
4. reported scores, confidence, and regret remain within bounds;
5. greater caution never rewards positive uncertainty penalties;
6. cost criteria are direction-inverted before aggregation;
7. fragility ranking maps to existing assumptions and affected options.

### 3. Reducer and authority tests

File: `src/domain/reducer.test.ts`

Verified cases:

1. staging an agent proposal leaves model entities unchanged;
2. an approved proposal is admitted only after explicit review;
3. rejection leaves the proposed model change unapplied;
4. criterion edits preserve total weight 100;
5. future edits preserve total probability 100;
6. direct score edits clamp to the declared scale;
7. assumption challenges have no effect before approval and apply afterward;
8. imported state receives a conservative structural check.

### 4. Protocol tests

File: `src/webmcp/protocol.test.ts`

Verified cases:

1. all registered names are unique and the expected annotations/lifecycle exist;
2. the deterministic development inspector remains available in non-WebMCP browsers;
3. read-only inspection returns current decision data;
4. unknown fields and fabricated entity IDs are rejected before logic runs;
5. an assumption challenge is staged but cannot approve itself;
6. presentation-only navigation leaves model revision unchanged.

### 5. Product integration tests

File: `src/App.test.tsx`

Verified cases:

1. the seeded Harbor City workspace renders with its question, options, and main landmark;
2. human navigation reaches Map, Matrix, Futures, and Audit;
3. the visible Protocol lens explains all three tool categories and endpoint names;
4. a human value-weight change is persisted in versioned browser-local state.

### 6. Production build

Command:

```bash
npm run build
```

This invokes:

```text
tsc -b && vite build
```

The verification workflow then asserts:

- `dist/index.html` exists and is nonempty;
- at least one built JavaScript and CSS asset exists;
- the built JavaScript contains `registerTool`;
- the public favicon and metadata files are present.

### 7. Portable deployment checks

The live workflow sets:

```bash
VITE_BASE_PATH=./
```

It requires relative JavaScript and CSS references in `dist/index.html`, making the artifact independent of a fixed path prefix.

It also requires:

- `.well-known/webmcp.json`;
- `llms.txt`;
- `site.webmanifest`;
- the same WebMCP registration code as the normal build.

### 8. Standalone artifact checks

Build command:

```bash
node scripts/build-standalone.mjs
```

Static checks:

- generated CSS and JavaScript entry points are found;
- replacement uses functions so `$` inside minified code is not interpreted;
- there is exactly one doctype;
- the application root exists;
- root appears before the inlined script;
- embedded JavaScript parses with `node:vm.Script`;
- `registerTool` and the final commitment endpoint remain embedded.

Executable smoke command:

```bash
node scripts/smoke-standalone.mjs
```

Runtime requirements:

- application shell rendered;
- decision map rendered;
- exactly 16 development-equivalent tools booted;
- inspection endpoint present;
- commitment endpoint present;
- no runtime error observed.

The smoke test was added after static inspection caught a corrupted first attempt and then caught the script-order defect in a second attempt. The final passing publish therefore exercises the emitted document rather than trusting text matches.

### 9. Browser acceptance checks

A headless Chromium run against the production preview checked:

- document title;
- main landmark;
- four initial option tickets;
- all 16 development-equivalent definitions;
- no desktop horizontal overflow at 1536×960;
- guided demo navigation to Audit;
- pending proposal visibility;
- approval transition;
- proposal status after approval;
- matching-funds assumption marked challenged;
- model revision incremented;
- no page errors or console errors;
- four navigation controls at 390×844;
- no mobile horizontal overflow;
- 66 px mobile top bar.

Screenshots retained in the repository:

- `docs/screenshots/forkroom-map.png`
- `docs/screenshots/forkroom-audit.png`
- `docs/screenshots/forkroom-mobile.png`

### 10. Demo-video checks

The final narrated/captioned demo was inspected and processed with FFmpeg.

Verified:

- duration 49.766667 seconds, below the challenge’s three-minute ceiling;
- H.264 video at 1536×960 and 30 frames per second;
- AAC mono audio at 48 kHz;
- integrated loudness approximately −16.1 LUFS;
- full decode completed without an error;
- visual contact sheet inspected;
- SHA-256 recorded above.

A compressed 960×600 copy also exists for low-bandwidth sharing:

- filename: `ForkRoom-WebMCP-Demo-GitHub.mp4`;
- size: 1,085,318 bytes;
- SHA-256: `7042031d0984633bbf0c0e52f814723c492945d417ef5b6e95cae261ee55c015`.

## Post-judging candidate checks

The candidate adds a fifth test file, `src/domain/validation.test.ts`, and a stale-revision protocol test. Its additional acceptance conditions are:

- all seven proposal schemas require `expected_revision`;
- all seven proposal handlers reject a stale revision before staging;
- accepted proposals retain `basedOnRevision` provenance;
- read, navigation, and proposal results carry correct revision receipts;
- exactly seven proposal tools carry the incubator-main `consequentialHint`;
- malformed snapshots fail deep field, bounds, uniqueness, relationship, payload, and review-state checks;
- invalid imports never replace current state.

Candidate target: **35 deterministic tests across five files** plus the unchanged contract audit, zero-warning lint, production build, standalone syntax parse, and executable boot/tool-discovery gate.

## Reproduce locally

Requirements:

- Node.js 24 or compatible modern Node release;
- npm;
- no API key;
- no backend service.

Run:

```bash
npm ci
node scripts/validate-webmcp.mjs
npm run lint
npm test -- --reporter=verbose
npm run build
```

Reproduce the publish artifact:

```bash
rm -rf dist
VITE_BASE_PATH=./ npm run build
node scripts/build-standalone.mjs
node scripts/smoke-standalone.mjs
```

Inspect registered definitions in a normal browser:

```js
const tools = window.__FORKROOM_DEVTOOLS__.listTools()
console.table(tools.map(({ name, mode, readOnly }) => ({ name, mode, readOnly })))
```

Execute a read-only endpoint:

```js
const result = await window.__FORKROOM_DEVTOOLS__.execute(
  'forkroom_inspect_decision',
  { detail: 'analysis' },
)
console.log(JSON.parse(result))
```

Stage a proposal and verify it remains pending:

```js
await window.__FORKROOM_DEVTOOLS__.execute(
  'forkroom_challenge_assumption',
  {
    assumption_id: 'matching',
    counterpoint: 'Comparable awards slipped beyond the construction invoice date.',
    revised_confidence: 28,
    test: 'Require a written disbursement milestone before procurement.',
    rationale: 'Funding timing is uncertain and materially changes infrastructure feasibility.',
  },
)
```

Then inspect the visible Audit view. The agent has no endpoint with which to approve that proposal.

## What remains unverified

The following are intentionally **not** claimed:

- exhaustive conformance across every experimental WebMCP browser build;
- public-preview uptime guarantees;
- confidentiality on a shared preview origin;
- statistical calibration of the seeded decision judgments;
- causal validity of option scores;
- exhaustive joint sensitivity across all criteria and futures;
- security against a compromised browser, extension, or operating system;
- quality of an inattentive human approval decision;
- formal verification of the complete React runtime or browser platform.

## Acceptance rule

ForkRoom is release-ready only when:

\[
C = A \land L \land T \land B \land S \land P,
\]

where:

- \(A\): WebMCP contract audit passes;
- \(L\): lint is clean;
- \(T\): all deterministic tests pass;
- \(B\): production build and entry checks pass;
- \(S\): standalone syntax and runtime smoke pass;
- \(P\): live publication succeeds with a matching source receipt.

For every release commit, both workflows must be green and `live/SOURCE_COMMIT` must equal that release commit before the artifact is treated as current.
