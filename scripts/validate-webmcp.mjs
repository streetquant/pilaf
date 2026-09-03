import { readFileSync } from 'node:fs'
import process from 'node:process'

function invariant(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${message}`)
  }
}

const protocol = readFileSync(new URL('../src/webmcp/protocol.ts', import.meta.url), 'utf8')
const declaration = readFileSync(new URL('../src/webmcp/webmcp.d.ts', import.meta.url), 'utf8')
const license = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8')
const validator = readFileSync(new URL('../src/domain/validation.ts', import.meta.url), 'utf8')

const names = [...protocol.matchAll(/name:\s*'(forkroom_[a-z0-9_]+)'/g)].map((match) => match[1])
const uniqueNames = new Set(names)
const readOnlyModes = [...protocol.matchAll(/mode:\s*'read'/g)].length
const proposalModes = [...protocol.matchAll(/mode:\s*'proposal'/g)].length
const navigationModes = [...protocol.matchAll(/mode:\s*'navigation'/g)].length

console.log('\nForkRoom WebMCP contract audit')
console.log('--------------------------------')
invariant(names.length === 16, `exactly 16 imperative tools are declared (found ${names.length})`)
invariant(uniqueNames.size === names.length, 'all tool names are unique')
invariant(Math.max(...names.map((name) => name.length)) <= 36, 'tool names remain inside a compact 36-character ceiling')
invariant(readOnlyModes === 8, `eight analytical tools are marked read-only (found ${readOnlyModes})`)
invariant(proposalModes === 7, `seven tools stage reviewable proposals (found ${proposalModes})`)
invariant(navigationModes === 1, `one tool changes presentation only (found ${navigationModes})`)
invariant(protocol.includes('modelContext.registerTool(tool'), 'production code invokes the imperative registerTool API')
invariant(
  protocol.includes('document.modelContext ?? navigator.modelContext'),
  'current document API is preferred with a legacy navigator fallback',
)
invariant(protocol.includes('additionalProperties: false'), 'root object schemas reject unknown properties')
invariant(protocol.includes('readOnlyHint'), 'read-only annotation hints are emitted')
invariant(protocol.includes('untrustedContentHint'), 'untrusted-content annotation hints are emitted')
invariant(
  protocol.includes("consequentialHint: metadata.mode === 'proposal'"),
  'proposal tools emit the incubator consequential annotation',
)
invariant(
  [...protocol.matchAll(/expected_revision: expectedRevision/g)].length === 7,
  'all seven proposal schemas require an optimistic revision precondition',
)
invariant(
  [...protocol.matchAll(/requireCurrentRevision\(input, state\)/g)].length === 7,
  'all seven proposal handlers enforce the revision precondition at runtime',
)
invariant(
  protocol.includes('model_revision_before') && protocol.includes('model_revision_after') && protocol.includes('state_changed'),
  'successful tool results contain auditable model-revision receipts',
)
invariant(
  validator.includes('rejectUnknownKeys') && validator.includes('validateProposalPayload'),
  'imported snapshots receive deep structural and referential validation',
)
invariant(protocol.includes("status: 'awaiting_human_approval'"), 'mutating tools return an explicit human-approval receipt')
invariant(!names.some((name) => /approve|reject/.test(name)), 'the agent tool surface exposes no self-approval capability')
invariant(protocol.includes('AbortController'), 'tool lifecycle is abortable')
invariant(declaration.includes('interface WebMcpModelContext'), 'the experimental browser contract is explicitly typed')
invariant(license.startsWith('MIT License'), 'a detectable open-source license is present')

if (process.exitCode) {
  console.error('\nWebMCP contract audit failed.')
  process.exit(process.exitCode)
}

console.log(`\n${names.length} tools verified: ${names.join(', ')}`)
