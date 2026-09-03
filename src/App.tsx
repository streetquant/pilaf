import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AgentRail, AuditView, ProtocolLens } from './components/Collaboration'
import { DecisionMapView, FuturesView, MatrixView } from './components/DecisionViews'
import { Icon, type IconName } from './components/Icon'
import { analyzeDecision } from './domain/analysis'
import { createDemoDecision } from './domain/demo'
import { createProposal, reduceDecision } from './domain/reducer'
import { assertDecisionState, isDecisionState } from './domain/validation'
import type {
  Activity,
  DecisionAction,
  DecisionState,
  ProposalInput,
  ViewId,
  WebMcpInvocation,
} from './domain/types'
import {
  FORKROOM_TOOL_COUNT,
  getToolSummaries,
  registerForkRoomTools,
  type ForkRoomBridge,
  type ProtocolStatus,
} from './webmcp/protocol'

const STORAGE_KEY = 'forkroom:webmcp:decision:v1'
const HISTORY_LIMIT = 50

const NAV_ITEMS: Array<{ id: ViewId; label: string; caption: string; icon: IconName; shortcut: string }> = [
  { id: 'map', label: 'Map', caption: 'See the whole choice', icon: 'map', shortcut: '1' },
  { id: 'matrix', label: 'Matrix', caption: 'Expose value judgments', icon: 'matrix', shortcut: '2' },
  { id: 'futures', label: 'Futures', caption: 'Stress-test uncertainty', icon: 'futures', shortcut: '3' },
  { id: 'audit', label: 'Audit', caption: 'Review every change', icon: 'audit', shortcut: '4' },
]

interface ToastState {
  message: string
  tone: 'default' | 'success' | 'warning'
}

function loadInitialState(): DecisionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDemoDecision()
    const parsed: unknown = JSON.parse(raw)
    return isDecisionState(parsed) ? parsed : createDemoDecision()
  } catch {
    return createDemoDecision()
  }
}

function isMutatingAction(action: DecisionAction): boolean {
  return !['set-view', 'select-option', 'set-guided-step'].includes(action.type)
}

function activityId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function executeForkRoomTool(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
  const developerSurface = window.__FORKROOM_DEVTOOLS__
  if (!developerSurface) throw new Error('ForkRoom tools are still starting. Try the demo again.')
  return developerSurface.execute(name, input)
}

function decisionRevisionFromToolResult(result: unknown): number {
  let decoded: unknown = result
  if (typeof result === 'string') decoded = JSON.parse(result)
  if (typeof decoded === 'object' && decoded !== null && 'content' in decoded) {
    const content = (decoded as { content?: Array<{ type?: string; text?: string }> }).content
    const text = content?.find((entry) => entry.type === 'text')?.text
    if (text) decoded = JSON.parse(text)
  }
  if (typeof decoded !== 'object' || decoded === null || !('data' in decoded)) {
    throw new TypeError('The inspection tool returned an unexpected result shape.')
  }
  const data = (decoded as { data?: unknown }).data
  if (typeof data !== 'object' || data === null || !('revision' in data)) {
    throw new TypeError('The inspection tool did not return a decision revision.')
  }
  const revision = (data as { revision?: unknown }).revision
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) {
    throw new TypeError('The inspection tool returned an invalid decision revision.')
  }
  return revision
}

function App() {
  const [state, setState] = useState<DecisionState>(loadInitialState)
  const stateRef = useRef(state)
  const historyRef = useRef<DecisionState[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus>({
    supported: false,
    registered: 0,
    total: FORKROOM_TOOL_COUNT,
  })
  const [invocations, setInvocations] = useState<WebMcpInvocation[]>([])
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [demoPhase, setDemoPhase] = useState(0)
  const demoTimersRef = useRef<number[]>([])
  const demoRevisionRef = useRef<number | null>(null)

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'default') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    stateRef.current = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // A blocked or exhausted storage area must not break the decision workspace.
    }
  }, [state])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProtocolOpen(false)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const previous = historyRef.current.at(-1)
        if (!previous) return
        historyRef.current = historyRef.current.slice(0, -1)
        const timestamp = new Date().toISOString()
        const keyboardUndoActivity: Activity = {
          id: activityId(),
          actor: 'human',
          kind: 'undo',
          message: 'Restored the previous decision state.',
          at: timestamp,
        }
        const restored: DecisionState = {
          ...structuredClone(previous),
          revision: stateRef.current.revision + 1,
          updatedAt: timestamp,
          activity: [keyboardUndoActivity, ...previous.activity].slice(0, 120),
        }
        stateRef.current = restored
        setState(restored)
        setHistoryCount(historyRef.current.length)
        notify('Previous decision state restored.', 'success')
      }
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      const item = NAV_ITEMS.find((candidate) => candidate.shortcut === event.key)
      if (item) {
        event.preventDefault()
        const next = reduceDecision(stateRef.current, { type: 'set-view', view: item.id })
        stateRef.current = next
        setState(next)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [notify])

  useEffect(() => () => {
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const dispatch = useCallback((action: DecisionAction, remember = isMutatingAction(action)) => {
    const previous = stateRef.current
    if (remember) {
      historyRef.current = [...historyRef.current, structuredClone(previous)].slice(-HISTORY_LIMIT)
      setHistoryCount(historyRef.current.length)
    }
    const next = reduceDecision(previous, action)
    stateRef.current = next
    setState(next)
    return next
  }, [])

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1)
    if (!previous) {
      notify('Nothing to undo yet.', 'warning')
      return
    }
    historyRef.current = historyRef.current.slice(0, -1)
    const timestamp = new Date().toISOString()
    const undoActivity: Activity = {
      id: activityId(),
      actor: 'human',
      kind: 'undo',
      message: 'Restored the previous decision state.',
      at: timestamp,
    }
    const restored: DecisionState = {
      ...structuredClone(previous),
      revision: stateRef.current.revision + 1,
      updatedAt: timestamp,
      activity: [undoActivity, ...previous.activity].slice(0, 120),
    }
    stateRef.current = restored
    setState(restored)
    setHistoryCount(historyRef.current.length)
    notify('Previous decision state restored.', 'success')
  }, [notify])

  const stageProposal = useCallback((input: ProposalInput) => {
    const proposal = createProposal(input)
    dispatch({ type: 'add-proposal', proposal })
    notify('Agent proposal staged for your review.', 'warning')
    return proposal
  }, [dispatch, notify])

  const navigate = useCallback((view: ViewId, optionId?: string) => {
    if (optionId) dispatch({ type: 'select-option', optionId }, false)
    dispatch({ type: 'set-view', view }, false)
  }, [dispatch])

  const onInvocation = useCallback((invocation: WebMcpInvocation) => {
    setInvocations((current) => [invocation, ...current].slice(0, 60))
  }, [])

  const bridge = useMemo<ForkRoomBridge>(() => ({
    getState: () => stateRef.current,
    stageProposal,
    navigate,
    onInvocation,
    onStatus: setProtocolStatus,
  }), [navigate, onInvocation, stageProposal])

  useEffect(() => registerForkRoomTools(bridge), [bridge])

  const toolSummaries = useMemo(() => getToolSummaries(), [])
  const analysis = useMemo(() => analyzeDecision(state), [state])
  const pendingCount = state.proposals.filter((proposal) => proposal.status === 'pending').length

  const reviewProposal = useCallback((proposalId: string, status: 'approved' | 'rejected') => {
    const proposal = stateRef.current.proposals.find((candidate) => candidate.id === proposalId)
    dispatch({ type: 'review-proposal', proposalId, status })
    notify(
      `${status === 'approved' ? 'Approved' : 'Rejected'}${proposal ? `: ${proposal.title}` : ' proposal'}.`,
      status === 'approved' ? 'success' : 'default',
    )
  }, [dispatch, notify])

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('Copied to clipboard.', 'success')
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      document.execCommand('copy')
      area.remove()
      notify('Copied to clipboard.', 'success')
    }
  }, [notify])

  const exportSnapshot = useCallback(() => {
    const snapshot = stateRef.current
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `forkroom-${snapshot.id}-r${snapshot.revision}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Versioned decision snapshot exported.', 'success')
  }, [notify])

  const importSnapshot = useCallback(async (file: File) => {
    try {
      const imported = assertDecisionState(JSON.parse(await file.text()) as unknown)
      dispatch({ type: 'load', state: imported })
      notify(`Imported ${imported.title}.`, 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not import that snapshot.', 'warning')
    }
  }, [dispatch, notify])

  const resetDecision = useCallback(() => {
    const confirmed = window.confirm('Reset this workspace to the original Harbor City demo? You can undo the reset afterward.')
    if (!confirmed) return
    dispatch({ type: 'reset', state: createDemoDecision() })
    notify('Demo workspace reset. Undo remains available.', 'success')
  }, [dispatch, notify])

  const runGuidedDemo = useCallback(() => {
    if (demoPhase > 0) return
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    demoRevisionRef.current = null
    setDemoPhase(1)

    const stopDemo = (message: string) => {
      demoTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      demoTimersRef.current = []
      demoRevisionRef.current = null
      setDemoPhase(0)
      notify(message, 'warning')
    }

    void (async () => {
      try {
        const inspection = await executeForkRoomTool('forkroom_inspect_decision', { detail: 'analysis' })
        demoRevisionRef.current = decisionRevisionFromToolResult(inspection)
        await executeForkRoomTool('forkroom_focus_view', { view: 'futures' })
      } catch (error) {
        navigate('futures')
        stopDemo(error instanceof Error ? error.message : 'Could not start the tool-guided demo.')
      }
    })()

    const phaseTwo = window.setTimeout(() => {
      setDemoPhase(2)
      void (async () => {
        try {
          await executeForkRoomTool('forkroom_find_fragile_assumptions', { limit: 1 })
          const duplicate = stateRef.current.proposals.some(
            (proposal) =>
              proposal.status === 'pending' &&
              proposal.kind === 'assumption-challenge' &&
              proposal.payload.assumption_id === 'matching',
          )
          if (!duplicate) {
            const expectedRevision = demoRevisionRef.current
            if (expectedRevision === null) throw new Error('The demo could not establish a fresh decision revision.')
            await executeForkRoomTool('forkroom_challenge_assumption', {
              expected_revision: expectedRevision,
              assumption_id: 'matching',
              counterpoint:
                'The latest grant cycle slipped twice, so construction invoices may arrive before reimbursement and force scope reduction.',
              revised_confidence: 28,
              test:
                'Ask the grants office for a written disbursement milestone; pre-authorize a no-match fallback before procurement.',
              rationale:
                'The grid option is highly exposed to a funding event with only 42% confidence; testing this dependency could change the preferred portfolio.',
            })
          }
        } catch (error) {
          stopDemo(error instanceof Error ? error.message : 'The agent tool sequence could not complete.')
        }
      })()
    }, 650)

    const phaseThree = window.setTimeout(() => {
      setDemoPhase(3)
      void executeForkRoomTool('forkroom_focus_view', { view: 'audit' }).catch(() => navigate('audit'))
    }, 1450)

    const finish = window.setTimeout(() => {
      demoRevisionRef.current = null
      setDemoPhase(0)
      notify('Demo complete: the real WebMCP tool path staged a proposal for your judgment.', 'success')
    }, 3300)

    demoTimersRef.current = [phaseTwo, phaseThree, finish]
  }, [demoPhase, navigate, notify])

  const selectedOption = state.options.find((option) => option.id === state.selectedOptionId)
  const topRisk = analysis.weakAssumptions[0]

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-workspace">Skip to decision workspace</a>

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="fork" size={22} /></div>
          <div><strong>ForkRoom</strong><span>WEBMCP DECISION LAB</span></div>
        </div>
        <div className="topbar-decision">
          <span className="decision-kicker">{state.title}</span>
          <strong>{state.question}</strong>
        </div>
        <div className="topbar-actions">
          <button className="protocol-status-button" onClick={() => setProtocolOpen(true)}>
            <span className={`protocol-pulse ${protocolStatus.supported && protocolStatus.registered > 0 ? 'is-live' : ''}`} />
            <span>
              <strong>{protocolStatus.supported && protocolStatus.registered > 0 ? 'WEBMCP LIVE' : `${FORKROOM_TOOL_COUNT} TOOLS READY`}</strong>
              <small>{protocolStatus.supported ? `${protocolStatus.registered} registered` : 'open in agent browser'}</small>
            </span>
          </button>
          <button className="icon-button" onClick={undo} disabled={historyCount === 0} aria-label="Undo last model change" title="Undo model change (Ctrl/⌘ Z)"><Icon name="undo" /></button>
          <button className="button top-demo-button" onClick={runGuidedDemo}><Icon name="spark" size={16} /> Judge demo</button>
        </div>
      </header>

      <div className="application-grid">
        <nav className="workspace-nav" aria-label="Decision workspace views">
          <div className="nav-section-label">Workspace</div>
          <div className="nav-items">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={state.activeView === item.id ? 'is-active' : ''}
                onClick={() => navigate(item.id)}
                aria-current={state.activeView === item.id ? 'page' : undefined}
              >
                <span className="nav-icon"><Icon name={item.icon} size={18} /></span>
                <span><strong>{item.label}</strong><small>{item.caption}</small></span>
                <kbd>{item.shortcut}</kbd>
              </button>
            ))}
          </div>

          <section className="brief-card" aria-labelledby="brief-heading">
            <div className="nav-section-label" id="brief-heading">Decision brief</div>
            <div className="brief-meta"><span>Envelope</span><strong>{state.budget}</strong></div>
            <div className="brief-meta"><span>Horizon</span><strong>{state.horizon}</strong></div>
            <details>
              <summary>{state.constraints.length} hard constraints <Icon name="chevron" size={14} /></summary>
              <ul>{state.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
            </details>
          </section>

          <section className="caution-control" aria-labelledby="caution-heading">
            <div>
              <span className="nav-section-label" id="caution-heading">Human caution</span>
              <strong>{Math.round(state.riskAversion * 100)}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.riskAversion}
              onChange={(event) => dispatch({ type: 'set-risk-aversion', value: Number(event.currentTarget.value) }, false)}
              aria-label="Human caution toward uncertainty"
            />
            <p>Controls how heavily uncertainty and future dispersion reduce option scores.</p>
            <div className="caution-labels"><span>explore</span><span>protect</span></div>
          </section>

          <div className="workspace-fingerprint">
            <span>LOCAL-FIRST</span><span>r{state.revision}</span><span>{state.updatedAt.slice(11, 16)} UTC</span>
          </div>
        </nav>

        <main id="main-workspace" className="main-workspace" tabIndex={-1}>
          <div className="workspace-context-strip">
            <div>
              <Icon name="target" size={16} />
              <span>{selectedOption ? `Inspecting ${selectedOption.name}` : 'Inspecting the full option set'}</span>
            </div>
            <div className="context-signals">
              <span><i className="signal-dot green" /> lead {analysis.lead.toFixed(1)}</span>
              <span><i className="signal-dot amber" /> {topRisk ? `top risk ${topRisk.risk.toFixed(1)}` : 'no risk signal'}</span>
              <span><i className="signal-dot violet" /> {pendingCount} pending</span>
            </div>
          </div>

          {state.activeView === 'map' ? (
            <DecisionMapView
              state={state}
              analysis={analysis}
              onSelectOption={(optionId) => dispatch({ type: 'select-option', optionId }, false)}
              onSetCriterionWeight={(criterionId, value) => dispatch({ type: 'set-criterion-weight', criterionId, value })}
              onSetOptionScore={(optionId, criterionId, value) => dispatch({ type: 'set-option-score', optionId, criterionId, value })}
              onSetScenarioProbability={(scenarioId, value) => dispatch({ type: 'set-scenario-probability', scenarioId, value })}
            />
          ) : null}
          {state.activeView === 'matrix' ? (
            <MatrixView
              state={state}
              analysis={analysis}
              onSelectOption={(optionId) => dispatch({ type: 'select-option', optionId }, false)}
              onSetCriterionWeight={(criterionId, value) => dispatch({ type: 'set-criterion-weight', criterionId, value })}
              onSetOptionScore={(optionId, criterionId, value) => dispatch({ type: 'set-option-score', optionId, criterionId, value })}
              onSetScenarioProbability={(scenarioId, value) => dispatch({ type: 'set-scenario-probability', scenarioId, value })}
            />
          ) : null}
          {state.activeView === 'futures' ? (
            <FuturesView
              state={state}
              analysis={analysis}
              onSelectOption={(optionId) => dispatch({ type: 'select-option', optionId }, false)}
              onSetCriterionWeight={(criterionId, value) => dispatch({ type: 'set-criterion-weight', criterionId, value })}
              onSetOptionScore={(optionId, criterionId, value) => dispatch({ type: 'set-option-score', optionId, criterionId, value })}
              onSetScenarioProbability={(scenarioId, value) => dispatch({ type: 'set-scenario-probability', scenarioId, value })}
            />
          ) : null}
          {state.activeView === 'audit' ? (
            <AuditView
              state={state}
              invocations={invocations}
              canUndo={historyCount > 0}
              onReview={reviewProposal}
              onUndo={undo}
              onExport={exportSnapshot}
              onImport={importSnapshot}
              onReset={resetDecision}
            />
          ) : null}
        </main>

        <AgentRail
          state={state}
          analysis={analysis}
          protocolStatus={protocolStatus}
          invocations={invocations}
          onReview={reviewProposal}
          onCopyPrompt={copyText}
          onRunDemo={runGuidedDemo}
          onOpenProtocol={() => setProtocolOpen(true)}
        />
      </div>

      <ProtocolLens
        open={protocolOpen}
        status={protocolStatus}
        tools={toolSummaries}
        invocations={invocations}
        onClose={() => setProtocolOpen(false)}
        onCopy={copyText}
      />

      {toast ? <div className={`toast toast-${toast.tone}`} role="status"><Icon name={toast.tone === 'warning' ? 'alert' : 'check'} size={16} />{toast.message}</div> : null}

      {demoPhase > 0 ? (
        <div className="demo-orchestrator" role="status" aria-live="polite">
          <div className="demo-agent"><Icon name="agent" /></div>
          <div>
            <span>DEMO AGENT · STEP {demoPhase}/3</span>
            <strong>
              {demoPhase === 1 ? 'Reading the live decision model…' : demoPhase === 2 ? 'Staging the highest-leverage challenge…' : 'Handing authority back to the human…'}
            </strong>
          </div>
          <div className="demo-progress"><i style={{ width: `${(demoPhase / 3) * 100}%` }} /></div>
        </div>
      ) : null}
    </div>
  )
}

export default App
