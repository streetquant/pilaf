import type { ChangeEvent } from 'react'
import type {
  DecisionAnalysis,
  DecisionState,
  Proposal,
  RegisteredToolSummary,
  WebMcpInvocation,
} from '../domain/types'
import type { ProtocolStatus } from '../webmcp/protocol'
import { Icon } from './Icon'

const DEMO_PROMPTS = [
  'Inspect this decision, find the most fragile assumption, and stage one challenge with a reversible evidence test.',
  'Compare Cooling Commons and Home Shield. Explain where their rankings come from and which value disagreement could reverse them.',
  'Propose a genuinely distinct fifth option. Score it conservatively, expose its dependencies, and leave it for my approval.',
]

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function proposalKindLabel(proposal: Proposal): string {
  const labels: Record<Proposal['kind'], string> = {
    option: 'OPTION',
    criterion: 'VALUE',
    assumption: 'ASSUMPTION',
    scenario: 'FUTURE',
    'score-change': 'SCORE',
    'assumption-challenge': 'CHALLENGE',
    commitment: 'COMMITMENT',
  }
  return labels[proposal.kind]
}

function pendingProposals(state: DecisionState): Proposal[] {
  return state.proposals.filter((proposal) => proposal.status === 'pending')
}

interface ProposalCardProps {
  proposal: Proposal
  compact?: boolean
  onReview: (proposalId: string, status: 'approved' | 'rejected') => void
}

export function ProposalCard({ proposal, compact = false, onReview }: ProposalCardProps) {
  return (
    <article className={`proposal-card ${compact ? 'is-compact' : ''}`}>
      <div className="proposal-meta">
        <span>
          {proposalKindLabel(proposal)}{proposal.basedOnRevision ? ` · BASE r${proposal.basedOnRevision}` : ''}
        </span>
        <time dateTime={proposal.createdAt}>{formatTimestamp(proposal.createdAt)}</time>
      </div>
      <h3>{proposal.title}</h3>
      <p>{proposal.rationale}</p>
      {!compact ? (
        <details className="proposal-payload">
          <summary>Inspect structured change</summary>
          <pre>{JSON.stringify(proposal.payload, null, 2)}</pre>
        </details>
      ) : null}
      <div className="proposal-actions">
        <button className="button approve-button" onClick={() => onReview(proposal.id, 'approved')}>
          <Icon name="check" size={16} /> Approve
        </button>
        <button className="button reject-button" onClick={() => onReview(proposal.id, 'rejected')}>
          <Icon name="x" size={16} /> Reject
        </button>
      </div>
    </article>
  )
}

interface AgentRailProps {
  state: DecisionState
  analysis: DecisionAnalysis
  protocolStatus: ProtocolStatus
  invocations: WebMcpInvocation[]
  onReview: (proposalId: string, status: 'approved' | 'rejected') => void
  onCopyPrompt: (prompt: string) => void
  onRunDemo: () => void
  onOpenProtocol: () => void
}

export function AgentRail({
  state,
  analysis,
  protocolStatus,
  invocations,
  onReview,
  onCopyPrompt,
  onRunDemo,
  onOpenProtocol,
}: AgentRailProps) {
  const pending = pendingProposals(state)
  const leader = state.options.find((option) => option.id === analysis.winnerId)?.name ?? 'No leader'
  return (
    <aside className="agent-rail" aria-labelledby="agent-rail-heading">
      <div className="agent-rail-header">
        <div className="agent-avatar"><Icon name="agent" /></div>
        <div>
          <span className="eyebrow">Shared agent channel</span>
          <h2 id="agent-rail-heading">ForkRoom copilot</h2>
        </div>
        <span className={`connection-light ${protocolStatus.supported && protocolStatus.registered > 0 ? 'is-live' : ''}`} title="WebMCP status" />
      </div>

      <button className="protocol-mini-card" onClick={onOpenProtocol}>
        <span className="protocol-icon"><Icon name="protocol" size={17} /></span>
        <span>
          <strong>{protocolStatus.supported ? `${protocolStatus.registered}/${protocolStatus.total} site tools` : 'WebMCP preview mode'}</strong>
          <small>{protocolStatus.supported ? 'registered in this page' : 'tools visible through dev console'}</small>
        </span>
        <Icon name="arrow" size={16} />
      </button>

      <div className="authority-contract">
        <div><Icon name="shield" size={18} /><strong>Authority contract</strong></div>
        <p><span>Agent</span> analyzes and stages. <span>Human</span> approves or rejects. Every substantive change is reversible and logged.</p>
      </div>

      {pending.length > 0 ? (
        <section className="rail-section pending-section" aria-label="Pending agent proposals">
          <div className="rail-section-heading">
            <span>Needs your judgment</span>
            <strong>{pending.length}</strong>
          </div>
          <div className="rail-proposal-stack">
            {pending.slice(0, 3).map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} compact onReview={onReview} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rail-section prompt-section" aria-label="Prompts to try with an agent">
          <div className="rail-section-heading">
            <span>Ask the page, not the DOM</span>
            <Icon name="spark" size={16} />
          </div>
          <div className="prompt-stack">
            {DEMO_PROMPTS.map((prompt, index) => (
              <button key={prompt} className="prompt-card" onClick={() => onCopyPrompt(prompt)}>
                <span>0{index + 1}</span>
                <p>{prompt}</p>
                <Icon name="copy" size={15} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rail-section agent-readout" aria-label="Current agent-readable decision signal">
        <div className="rail-section-heading"><span>Live readout</span><small>revision {state.revision}</small></div>
        <div className="readout-row"><span>Leader</span><strong>{leader}</strong></div>
        <div className="readout-row"><span>Lead</span><strong>{analysis.lead.toFixed(1)} pts</strong></div>
        <div className="readout-row"><span>Fragile inputs</span><strong>{analysis.weakAssumptions.filter((risk) => risk.risk >= 15).length}</strong></div>
        <div className="readout-row"><span>Rank flips</span><strong>{analysis.rankReversals.length}</strong></div>
      </section>

      {invocations.length > 0 ? (
        <section className="rail-section recent-tools" aria-label="Recent WebMCP activity">
          <div className="rail-section-heading"><span>Recent site tools</span><small>{invocations.length}</small></div>
          {invocations.slice(0, 3).map((invocation) => (
            <div className="tool-call-row" key={invocation.id}>
              <i className={invocation.ok ? 'is-ok' : 'is-error'} />
              <span>
                <strong>{invocation.tool.replace('forkroom_', '')}</strong>
                <small>{invocation.effect} · r{invocation.modelRevisionBefore}→r{invocation.modelRevisionAfter}</small>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <button className="run-demo-button" onClick={onRunDemo}>
        <span><Icon name="spark" /> Run the 30-second judge demo</span>
        <Icon name="arrow" />
      </button>
    </aside>
  )
}

interface AuditViewProps {
  state: DecisionState
  invocations: WebMcpInvocation[]
  canUndo: boolean
  onReview: (proposalId: string, status: 'approved' | 'rejected') => void
  onUndo: () => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
}

export function AuditView({
  state,
  invocations,
  canUndo,
  onReview,
  onUndo,
  onExport,
  onImport,
  onReset,
}: AuditViewProps) {
  const pending = pendingProposals(state)
  const reviewed = state.proposals.filter((proposal) => proposal.status !== 'pending')

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (file) onImport(file)
    event.currentTarget.value = ''
  }

  return (
    <section className="workspace-view audit-view" aria-labelledby="audit-heading">
      <div className="view-heading-row">
        <div>
          <span className="eyebrow">Nothing changes invisibly</span>
          <h2 id="audit-heading">Decision ledger</h2>
          <p>Proposals, approvals, human edits, and tool calls remain attributable and inspectable.</p>
        </div>
        <div className="audit-controls">
          <button className="icon-button labeled" onClick={onUndo} disabled={!canUndo}><Icon name="undo" /><span>Undo</span></button>
          <button className="icon-button labeled" onClick={onExport}><Icon name="download" /><span>Export</span></button>
          <label className="icon-button labeled file-button"><Icon name="upload" /><span>Import</span><input type="file" accept="application/json,.json" onChange={handleImport} /></label>
          <button className="icon-button labeled danger-subtle" onClick={onReset}><Icon name="reset" /><span>Reset</span></button>
        </div>
      </div>

      {state.commitment ? (
        <article className="commitment-banner">
          <div className="commitment-mark"><Icon name="target" size={24} /></div>
          <div>
            <span className="eyebrow">Human-approved commitment</span>
            <h3>{state.commitment.statement}</h3>
            <p>Review: {state.commitment.reviewDate}</p>
            <ul>{state.commitment.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul>
          </div>
        </article>
      ) : null}

      <div className="audit-grid">
        <section className="proposal-ledger" aria-labelledby="proposal-ledger-heading">
          <div className="panel-title-row">
            <div><span className="eyebrow">Human approval gate</span><h3 id="proposal-ledger-heading">Agent proposals</h3></div>
            <span className="count-chip">{pending.length} pending</span>
          </div>
          {pending.length > 0 ? (
            <div className="proposal-list">
              {pending.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onReview={onReview} />)}
            </div>
          ) : (
            <div className="empty-ledger">
              <Icon name="shield" size={28} />
              <strong>No unreviewed changes</strong>
              <p>Agent tools can stage structured proposals, but only a visible human action can admit them to the model.</p>
            </div>
          )}
          {reviewed.length > 0 ? (
            <details className="reviewed-proposals">
              <summary>{reviewed.length} reviewed proposal{reviewed.length === 1 ? '' : 's'}</summary>
              <div>
                {reviewed.map((proposal) => (
                  <article key={proposal.id}>
                    <span className={`review-state is-${proposal.status}`}>{proposal.status}</span>
                    <strong>{proposal.title}</strong>
                    <time>{formatTimestamp(proposal.reviewedAt ?? proposal.createdAt)}</time>
                  </article>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <section className="activity-ledger" aria-labelledby="activity-heading">
          <div className="panel-title-row">
            <div><span className="eyebrow">Attribution</span><h3 id="activity-heading">Activity stream</h3></div>
            <span className="count-chip">{state.activity.length + invocations.length} events</span>
          </div>
          <div className="timeline">
            {[
              ...state.activity.map((activity) => ({
                id: activity.id,
                actor: activity.actor,
                kind: activity.kind,
                message: activity.message,
                at: activity.at,
              })),
              ...invocations.map((invocation) => ({
                id: invocation.id,
                actor: 'agent' as const,
                kind: invocation.tool,
                message: invocation.summary,
                at: invocation.at,
              })),
            ]
              .sort((left, right) => right.at.localeCompare(left.at))
              .slice(0, 30)
              .map((event) => (
                <article className={`timeline-event actor-${event.actor}`} key={event.id}>
                  <div className="timeline-dot">{event.actor === 'agent' ? <Icon name="agent" size={13} /> : event.actor === 'human' ? 'H' : 'S'}</div>
                  <div>
                    <div><span>{event.actor}</span><time dateTime={event.at}>{formatTimestamp(event.at)}</time></div>
                    <strong>{event.message}</strong>
                    <small>{event.kind}</small>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </section>
  )
}

interface ProtocolLensProps {
  open: boolean
  status: ProtocolStatus
  tools: RegisteredToolSummary[]
  invocations: WebMcpInvocation[]
  onClose: () => void
  onCopy: (text: string) => void
}

export function ProtocolLens({ open, status, tools, invocations, onClose, onCopy }: ProtocolLensProps) {
  if (!open) return null
  const groups: Array<{ mode: RegisteredToolSummary['mode']; title: string; explanation: string }> = [
    { mode: 'read', title: 'Observe & falsify', explanation: 'Side-effect-free inspection and what-if computation.' },
    { mode: 'proposal', title: 'Stage, never smuggle', explanation: 'Structured mutations wait behind a human approval gate.' },
    { mode: 'navigation', title: 'Share attention', explanation: 'Move the visible interface without editing decision data.' },
  ]
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="protocol-lens" role="dialog" aria-modal="true" aria-labelledby="protocol-heading" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="protocol-mark"><Icon name="protocol" size={24} /></div>
          <div>
            <span className="eyebrow">Protocol lens</span>
            <h2 id="protocol-heading">The page is the shared tool server</h2>
            <p>Exactly the same browser-local state and reducer power both the human interface and every WebMCP tool.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close protocol lens"><Icon name="x" /></button>
        </header>

        <div className="protocol-status-card">
          <span className={`protocol-pulse ${status.supported && status.registered > 0 ? 'is-live' : ''}`} />
          <div>
            <strong>{status.supported ? `${status.registered} of ${status.total} tools registered` : `${status.total} tools ready; WebMCP API not exposed in this browser`}</strong>
            <p>{status.supported ? 'This top-level page registered imperative site tools with abortable lifecycles.' : 'Open in a compatible agent browser, or inspect the identical development surface below.'}</p>
          </div>
          <button className="button secondary-button" onClick={() => onCopy('window.__FORKROOM_DEVTOOLS__.listTools()')}><Icon name="copy" size={15} /> Copy inspector command</button>
        </div>

        <div className="protocol-principles">
          <article><span>01</span><strong>Narrow schemas</strong><p>Closed root objects, bounded strings and arrays, verified IDs, and independent runtime validation.</p></article>
          <article><span>02</span><strong>Human sovereignty</strong><p>No site tool can approve a substantive change. The authority boundary exists in code, not copy.</p></article>
          <article><span>03</span><strong>Verifiable effects</strong><p>Every tool returns an invocation/effect/revision receipt. Proposals also return a visible ID and retain their base revision.</p></article>
          <article><span>04</span><strong>Untrusted by design</strong><p>Workspace content is annotated as untrusted data and never embedded into tool metadata.</p></article>
        </div>

        <div className="tool-catalogue">
          {groups.map((group) => (
            <section key={group.mode}>
              <div className="tool-group-heading"><div><span className="eyebrow">{group.mode}</span><h3>{group.title}</h3></div><p>{group.explanation}</p></div>
              <div className="tool-list">
                {tools.filter((tool) => tool.mode === group.mode).map((tool) => (
                  <article key={tool.name}>
                    <div>
                      <code>{tool.name}</code>
                      {tool.readOnly ? <span>READ ONLY</span> : tool.consequential ? <span>REVIEW GATED</span> : null}
                    </div>
                    <p>{tool.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        {invocations.length > 0 ? (
          <footer>
            <span className="eyebrow">Most recent invocation</span>
            <strong>{invocations[0].tool}</strong>
            <p>
              {invocations[0].effect} · revision {invocations[0].modelRevisionBefore}→{invocations[0].modelRevisionAfter} · {invocations[0].summary}
            </p>
          </footer>
        ) : null}
      </section>
    </div>
  )
}
