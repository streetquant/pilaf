#!/usr/bin/env bash
set -euo pipefail

readonly BASE_BRANCH='forkroom-v1.1.0-post.1-source'
readonly BASE_COMMIT='1b2ee8fd3589c2b438f9760248ef631f552b4e4e'
readonly SOURCE_BRANCH='forkroom-v1.1.0-post.2-source'
readonly LIVE_BRANCH='forkroom-v1.1.0-post.2-live'
readonly RELEASE_NAME='ForkRoom-v1.1.0-post.2'
readonly REPO_SLUG="${GITHUB_REPOSITORY:-streetquant/pilaf}"
readonly WORK_ROOT="${RUNNER_TEMP:-/tmp}/forkroom-post2"
readonly MIGRATION_ROOT="$WORK_ROOT/migration"
readonly CANDIDATE="$WORK_ROOT/candidate"
readonly LIVE_ROOT="$WORK_ROOT/live"
readonly BUNDLE="$WORK_ROOT/$RELEASE_NAME"
readonly OUTPUT_ROOT="${GITHUB_WORKSPACE:-$PWD}/forkroom-post2/output"
readonly AUDIT_LOG="$WORK_ROOT/npm-ci-audit.log"
readonly DEPENDENCY_TREE="$WORK_ROOT/npm-dependency-tree.json"
readonly SHA_CROSSCHECK="$WORK_ROOT/sha256-crosscheck.txt"

section() {
  printf '\n::group::%s\n' "$1"
}

end_section() {
  printf '::endgroup::\n'
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

rm -rf "$WORK_ROOT" "$OUTPUT_ROOT"
mkdir -p "$MIGRATION_ROOT" "$OUTPUT_ROOT"

section 'Reconstruct and verify deterministic migrations'
cat forkroom-post2/apply_post2.py.xz.b64.part-* \
  | base64 --decode \
  | xz --decompress > "$MIGRATION_ROOT/apply_post2.py"
cp forkroom-post2/apply_post2.py.sha256 "$MIGRATION_ROOT/"
cp forkroom-post2/apply_post2_fix.py "$MIGRATION_ROOT/"
cp forkroom-post2/apply_post2_fix.py.sha256 "$MIGRATION_ROOT/"
(
  cd "$MIGRATION_ROOT"
  sha256sum --check apply_post2.py.sha256
  sha256sum --check apply_post2_fix.py.sha256
  python -m py_compile apply_post2.py apply_post2_fix.py
)
end_section

section 'Clone exact verified post.1 source'
git clone --depth 1 --single-branch --branch "$BASE_BRANCH" \
  "https://github.com/$REPO_SLUG.git" "$CANDIDATE"
actual_base="$(git -C "$CANDIDATE" rev-parse HEAD)"
[[ "$actual_base" == "$BASE_COMMIT" ]] || fail "base commit mismatch: $actual_base"
end_section

section 'Apply post.2 standards and integrity migrations'
python "$MIGRATION_ROOT/apply_post2.py" "$CANDIDATE"
python "$MIGRATION_ROOT/apply_post2_fix.py" "$CANDIDATE"
[[ "$(node -p "require('$CANDIDATE/package.json').version")" == '1.1.0-post.2' ]] \
  || fail 'package version mismatch'
git -C "$CANDIDATE" diff --check
end_section

section 'Install exact dependencies and capture audit receipt'
(
  cd "$CANDIDATE"
  npm ci --audit=true --audit-level=high 2>&1 | tee "$AUDIT_LOG"
  grep -Eq 'found 0 vulnerabilities|0 vulnerabilities' "$AUDIT_LOG"
  npm ls --all --json > "$DEPENDENCY_TREE"
)
[[ -s "$DEPENDENCY_TREE" ]] || fail 'dependency tree receipt is empty'
end_section

section 'Strictly typecheck domain and WebMCP boundary'
(
  cd "$CANDIDATE"
  npx tsc --ignoreConfig --noEmit \
    --target ES2022 \
    --module ESNext \
    --moduleResolution Bundler \
    --strict \
    --skipLibCheck \
    --lib ES2022,DOM \
    src/domain/types.ts \
    src/domain/analysis.ts \
    src/domain/demo.ts \
    src/domain/integrity.ts \
    src/domain/validation.ts \
    src/domain/reducer.ts \
    src/webmcp/webmcp.d.ts \
    src/webmcp/protocol.ts
)
end_section

section 'Cross-check SHA-256 against Node crypto boundary vectors'
readonly HASH_BUILD="$WORK_ROOT/integrity-js"
mkdir -p "$HASH_BUILD"
(
  cd "$CANDIDATE"
  npx tsc --ignoreConfig \
    --target ES2022 \
    --module CommonJS \
    --moduleResolution Node \
    --strict \
    --skipLibCheck \
    --lib ES2022,DOM \
    --outDir "$HASH_BUILD" \
    src/domain/types.ts \
    src/domain/integrity.ts
)
HASH_BUILD="$HASH_BUILD" node <<'NODE' | tee "$SHA_CROSSCHECK"
const crypto = require('node:crypto')
const path = require('node:path')
const { sha256Hex } = require(path.join(process.env.HASH_BUILD, 'integrity.js'))
const values = [
  '',
  'a',
  'abc',
  'The quick brown fox jumps over the lazy dog',
  'é',
  'e\u0301',
  '🚀'.repeat(40),
  'x'.repeat(55),
  'x'.repeat(56),
  'x'.repeat(63),
  'x'.repeat(64),
  'x'.repeat(65),
  'x'.repeat(1000),
]
for (const value of values) {
  const expected = crypto.createHash('sha256').update(value, 'utf8').digest('hex')
  const actual = sha256Hex(value)
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for UTF-8 length ${Buffer.byteLength(value)}`)
  }
}
console.log(`SHA-256 cross-check passed for ${values.length} boundary and Unicode vectors.`)
NODE
end_section

section 'Audit WebMCP authority, result, and integrity contracts'
(
  cd "$CANDIDATE"
  node scripts/validate-webmcp.mjs
)
end_section

section 'Lint with zero warnings'
(
  cd "$CANDIDATE"
  npm run lint
)
end_section

section 'Run 45 deterministic tests'
(
  cd "$CANDIDATE"
  npm test -- --reporter=verbose
  count="$(grep -Rhc '^[[:space:]]*it(' src --include='*.test.ts' --include='*.test.tsx' | awk '{sum += $1} END {print sum}')"
  [[ "$count" == '45' ]] || fail "expected 45 tests, found $count"
  printf 'Verified %s deterministic tests.\n' "$count"
)
end_section

section 'Build portable production application'
(
  cd "$CANDIDATE"
  VITE_BASE_PATH=./ npm run build
)
end_section

section 'Build and boot self-contained application'
(
  cd "$CANDIDATE"
  node scripts/build-standalone.mjs
  node scripts/smoke-standalone.mjs
)
end_section

section 'Verify release invariants'
(
  cd "$CANDIDATE"
  node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs'
const manifest = JSON.parse(readFileSync('public/.well-known/webmcp.json', 'utf8'))
const names = manifest.tools.map((tool) => tool.name)
if (manifest.version !== '1.1.0-post.2') throw new Error('manifest version mismatch')
if (names.length !== 17 || new Set(names).size !== 17) throw new Error('tool-count or uniqueness mismatch')
if (manifest.tools.filter((tool) => tool.readOnly).length !== 9) throw new Error('read-only count mismatch')
if (manifest.tools.filter((tool) => tool.mode === 'proposal').length !== 7) throw new Error('proposal count mismatch')
if (manifest.tools.some((tool) => tool.consequential)) throw new Error('reversible tools must not be marked consequential')
if (!names.includes('forkroom_verify_workspace')) throw new Error('workspace verifier missing')
if (manifest.optimisticConcurrency.approvalBinding !== 'basedOnModelDigest') {
  throw new Error('approval digest binding missing')
}
NODE
  [[ "$(grep -c 'basedOnModelDigest,' src/webmcp/protocol.ts)" == '7' ]]
  [[ "$(grep -c 'based_on_model_digest' src/webmcp/protocol.ts)" -ge 1 ]]
  grep -q "content: \[{ type: 'text', text }\]" src/webmcp/protocol.ts
  grep -q 'consequentialHint: false' src/webmcp/protocol.ts
  grep -q 'const hash: number\[\]' src/domain/integrity.ts
  grep -q 'forkroom:canonical-model:v1' src/domain/integrity.ts
  grep -q 'forkroom:review-workspace:v1' src/domain/integrity.ts
  grep -q 'Canonical model changed after this proposal was staged' src/domain/reducer.ts
  grep -q 'workspace verifier accepts the seeded graph' scripts/smoke-standalone.mjs
  [[ -s dist/standalone.html ]]
  grep -q 'forkroom_verify_workspace' dist/standalone.html
)
end_section

section 'Commit and publish verified source branch'
git -C "$CANDIDATE" config user.name 'github-actions[bot]'
git -C "$CANDIDATE" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git -C "$CANDIDATE" add -A
git -C "$CANDIDATE" commit -m 'release: ForkRoom v1.1.0-post.2 standards and integrity'
readonly CANDIDATE_SHA="$(git -C "$CANDIDATE" rev-parse HEAD)"
[[ -n "${GITHUB_TOKEN:-}" ]] || fail 'GITHUB_TOKEN is required for publication'
git -C "$CANDIDATE" remote set-url origin \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"
git -C "$CANDIDATE" push --force origin "HEAD:refs/heads/$SOURCE_BRANCH"
end_section

section 'Publish verified live branch'
mkdir -p "$LIVE_ROOT"
cp -a "$CANDIDATE/dist/." "$LIVE_ROOT/"
printf '%s\n' "$CANDIDATE_SHA" > "$LIVE_ROOT/SOURCE_COMMIT"
printf '%s\n' "$BASE_COMMIT" > "$LIVE_ROOT/BASE_SOURCE_COMMIT"
cat > "$LIVE_ROOT/PUBLICATION_RECEIPT.txt" <<EOF
ForkRoom v1.1.0-post.2 verified live publication
Source repository: https://github.com/$REPO_SLUG
Source branch: $SOURCE_BRANCH
Source commit: $CANDIDATE_SHA
Verification run: https://github.com/$REPO_SLUG/actions/runs/${GITHUB_RUN_ID:-local}
WebMCP tools: 17
Deterministic tests: 45
Dependency install audit: 0 vulnerabilities
SHA-256 cross-check vectors: 13
Result contract: structured content text envelope
Integrity: domain-separated SHA-256 model and review digests
Human authority: proposal approval unavailable to WebMCP tools
Status: post-judging continuation; not the frozen competition submission
EOF
git -C "$LIVE_ROOT" init -b "$LIVE_BRANCH"
git -C "$LIVE_ROOT" config user.name 'github-actions[bot]'
git -C "$LIVE_ROOT" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git -C "$LIVE_ROOT" add -A
git -C "$LIVE_ROOT" commit -m "deploy: ForkRoom v1.1.0-post.2 from $CANDIDATE_SHA"
git -C "$LIVE_ROOT" remote add origin \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"
git -C "$LIVE_ROOT" push --force origin "HEAD:refs/heads/$LIVE_BRANCH"
end_section

section 'Assemble and independently verify release archive'
mkdir -p "$BUNDLE/source" "$BUNDLE/build"
git -C "$CANDIDATE" archive --format=tar HEAD | tar -x -C "$BUNDLE/source"
cp -a "$CANDIDATE/dist/." "$BUNDLE/build/"
cp "$MIGRATION_ROOT/apply_post2.py" "$BUNDLE/"
cp "$MIGRATION_ROOT/apply_post2.py.sha256" "$BUNDLE/"
cp "$MIGRATION_ROOT/apply_post2_fix.py" "$BUNDLE/"
cp "$MIGRATION_ROOT/apply_post2_fix.py.sha256" "$BUNDLE/"
cp "$AUDIT_LOG" "$BUNDLE/NPM_CI_AUDIT.txt"
cp "$DEPENDENCY_TREE" "$BUNDLE/NPM_DEPENDENCY_TREE.json"
cp "$SHA_CROSSCHECK" "$BUNDLE/SHA256_CROSSCHECK.txt"
cp "$LIVE_ROOT/PUBLICATION_RECEIPT.txt" "$BUNDLE/"
cat > "$BUNDLE/RELEASE_RECEIPT.txt" <<EOF
ForkRoom v1.1.0-post.2 release receipt
Base source commit: $BASE_COMMIT
Candidate source commit: $CANDIDATE_SHA
Verification workflow: https://github.com/$REPO_SLUG/actions/runs/${GITHUB_RUN_ID:-local}
Tool count: 17
Read-only tools: 9
Proposal-staging tools: 7
Navigation tools: 1
Consequential tools: 0
Deterministic tests: 45
Dependency install audit: 0 vulnerabilities
SHA-256 cross-check vectors: 13
Result: migration checksums, lockfile audit, strict boundary typecheck, crypto cross-check, contract audit, lint, tests, build, standalone parse, and standalone boot passed
EOF
(
  cd "$BUNDLE"
  find . -type f ! -name SHA256SUMS.txt -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum > SHA256SUMS.txt
)
(
  cd "$(dirname "$BUNDLE")"
  zip -X -q -r "$OUTPUT_ROOT/$RELEASE_NAME-verified.zip" "$RELEASE_NAME"
)
(
  cd "$OUTPUT_ROOT"
  sha256sum "$RELEASE_NAME-verified.zip" > "$RELEASE_NAME-verified.zip.sha256"
)
readonly VERIFY_ROOT="$WORK_ROOT/verify"
mkdir -p "$VERIFY_ROOT"
cp "$OUTPUT_ROOT/$RELEASE_NAME-verified.zip" \
  "$OUTPUT_ROOT/$RELEASE_NAME-verified.zip.sha256" \
  "$VERIFY_ROOT/"
(
  cd "$VERIFY_ROOT"
  sha256sum --check "$RELEASE_NAME-verified.zip.sha256"
  unzip -q "$RELEASE_NAME-verified.zip"
  cd "$RELEASE_NAME"
  sha256sum --check SHA256SUMS.txt
  sha256sum --check apply_post2.py.sha256
  sha256sum --check apply_post2_fix.py.sha256
  grep -q "$CANDIDATE_SHA" RELEASE_RECEIPT.txt
  grep -Eq 'found 0 vulnerabilities|0 vulnerabilities' NPM_CI_AUDIT.txt
  grep -q '13 boundary and Unicode vectors' SHA256_CROSSCHECK.txt
  grep -q 'forkroom_verify_workspace' build/standalone.html
)
end_section

cat > "$OUTPUT_ROOT/POST2_SUMMARY.md" <<EOF
# ForkRoom v1.1.0-post.2 verified

- Source branch: \`$SOURCE_BRANCH\`
- Source commit: \`$CANDIDATE_SHA\`
- Live branch: \`$LIVE_BRANCH\`
- WebMCP tools: **17**
- Deterministic tests: **45**
- Exact-install audit: **0 vulnerabilities**
- SHA-256 independent cross-checks: **13**
- Structured WebMCP content result: **pass**
- Canonical/review digest separation: **pass**
- Approval-time content binding: **pass**
- Standalone executable boot: **pass**
EOF

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "$OUTPUT_ROOT/POST2_SUMMARY.md" >> "$GITHUB_STEP_SUMMARY"
fi

printf '\nForkRoom v1.1.0-post.2 verified and published.\n'
printf 'Source commit: %s\n' "$CANDIDATE_SHA"
printf 'Artifact: %s\n' "$OUTPUT_ROOT/$RELEASE_NAME-verified.zip"
