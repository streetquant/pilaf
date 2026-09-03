import { clamp } from './analysis'
import type {
  Activity,
  Assumption,
  Criterion,
  DecisionAction,
  DecisionState,
  Option,
  Proposal,
  ProposalInput,
  Scenario,
} from './types'

const MAX_ACTIVITY = 120
const MAX_PROPOSALS = 40

function now(): string {
  return new Date().toISOString()
}

function uid(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `${prefix}-${random}`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function createActivity(actor: Activity['actor'], kind: string, message: string, entityId?: string): Activity {
  return {
    id: uid('activity'),
    actor,
    kind,
    message,
    at: now(),
    ...(entityId ? { entityId } : {}),
  }
}

function update(
  state: DecisionState,
  patch: Partial<DecisionState>,
  activity?: Activity,
): DecisionState {
  const timestamp = now()
  return {
    ...state,
    ...patch,
    revision: state.revision + 1,
    updatedAt: timestamp,
    activity: activity ? [activity, ...state.activity].slice(0, MAX_ACTIVITY) : state.activity,
  }
}

function redistribute<T extends { id: string }>(
  items: T[],
  targetId: string,
  requested: number,
  read: (item: T) => number,
  write: (item: T, value: number) => T,
): T[] {
  const target = items.find((item) => item.id === targetId)
  if (!target) return items
  if (items.length === 1) return [write(target, 100)]

  const targetValue = clamp(requested, 0, 100)
  const remainder = 100 - targetValue
  const others = items.filter((item) => item.id !== targetId)
  const otherTotal = others.reduce((sum, item) => sum + Math.max(0, read(item)), 0)
  const equalShare = remainder / others.length

  return items.map((item) => {
    if (item.id === targetId) return write(item, targetValue)
    const next = otherTotal > 0 ? (Math.max(0, read(item)) / otherTotal) * remainder : equalShare
    return write(item, next)
  })
}

function addCriterion(state: DecisionState, payload: Record<string, unknown>): DecisionState {
  const name = text(payload.name, 'Untitled criterion')
  const requestedId = slugify(text(payload.id, name)) || uid('criterion')
  const id = state.criteria.some((criterion) => criterion.id === requestedId)
    ? `${requestedId}-${state.criteria.length + 1}`
    : requestedId
  const weight = clamp(number(payload.weight, 15), 1, 60)
  const direction = payload.direction === 'cost' ? 'cost' : 'benefit'
  const retainedWeight = Math.max(0, 100 - weight)
  const existingTotal = state.criteria.reduce((sum, criterion) => sum + Math.max(0, criterion.weight), 0)
  const criteria = state.criteria.map((criterion) => ({
    ...criterion,
    weight: existingTotal > 0 ? (criterion.weight / existingTotal) * retainedWeight : retainedWeight / state.criteria.length,
  }))
  const criterion: Criterion = {
    id,
    name,
    description: text(payload.description, 'Agent-proposed decision value.'),
    weight,
    direction,
    unit: text(payload.unit, 'relative score'),
  }
  const defaultScore = clamp(number(payload.default_score, 50), 0, 100)
  const options = state.options.map((option) => ({ ...option, scores: { ...option.scores, [id]: defaultScore } }))

  return { ...state, criteria: [...criteria, criterion], options }
}

function addScenario(state: DecisionState, payload: Record<string, unknown>): DecisionState {
  const name = text(payload.name, 'Untitled future')
  const requestedId = slugify(text(payload.id, name)) || uid('scenario')
  const id = state.scenarios.some((scenario) => scenario.id === requestedId)
    ? `${requestedId}-${state.scenarios.length + 1}`
    : requestedId
  const probability = clamp(number(payload.probability, 10), 1, 60)
  const retainedProbability = Math.max(0, 100 - probability)
  const existingTotal = state.scenarios.reduce((sum, scenario) => sum + Math.max(0, scenario.probability), 0)
  const scenarios = state.scenarios.map((scenario) => ({
    ...scenario,
    probability:
      existingTotal > 0
        ? (scenario.probability / existingTotal) * retainedProbability
        : retainedProbability / state.scenarios.length,
  }))
  const severity = ['low', 'medium', 'high', 'extreme'].includes(text(payload.severity))
    ? (text(payload.severity) as Scenario['severity'])
    : 'medium'
  const scenario: Scenario = {
    id,
    name,
    description: text(payload.description, 'Agent-proposed future condition.'),
    probability,
    severity,
  }
  const impactByOption = record(payload.impact_by_option)
  const options = state.options.map((option) => ({
    ...option,
    scenarioImpacts: {
      ...option.scenarioImpacts,
      [id]: clamp(number(impactByOption[option.id], 0), -40, 40),
    },
  }))

  return { ...state, scenarios: [...scenarios, scenario], options }
}

function addAssumption(state: DecisionState, payload: Record<string, unknown>): DecisionState {
  const statement = text(payload.statement, 'Untitled assumption')
  const requestedId = slugify(text(payload.id, statement)) || uid('assumption')
  const id = state.assumptions.some((assumption) => assumption.id === requestedId)
    ? `${requestedId}-${state.assumptions.length + 1}`
    : requestedId
  const assumption: Assumption = {
    id,
    statement,
    confidence: clamp(number(payload.confidence, 50), 0, 100),
    impact: clamp(number(payload.impact, 50), 0, 100),
    evidence: text(payload.evidence, 'No supporting evidence supplied yet.'),
    challenged: false,
  }
  const exposureByOption = record(payload.exposure_by_option)
  const options = state.options.map((option) => ({
    ...option,
    assumptionExposure: {
      ...option.assumptionExposure,
      [id]: clamp(number(exposureByOption[option.id], 40), 0, 100),
    },
  }))

  return { ...state, assumptions: [...state.assumptions, assumption], options }
}

function addOption(state: DecisionState, payload: Record<string, unknown>): DecisionState {
  const name = text(payload.name, 'Untitled option')
  const requestedId = slugify(text(payload.id, name)) || uid('option')
  const id = state.options.some((option) => option.id === requestedId)
    ? `${requestedId}-${state.options.length + 1}`
    : requestedId
  const suppliedScores = record(payload.scores)
  const suppliedImpacts = record(payload.scenario_impacts)
  const suppliedExposures = record(payload.assumption_exposure)
  const option: Option = {
    id,
    name,
    description: text(payload.description, 'Agent-proposed option.'),
    thesis: text(payload.thesis, 'A candidate path to examine.'),
    scores: Object.fromEntries(
      state.criteria.map((criterion) => [criterion.id, clamp(number(suppliedScores[criterion.id], 50), 0, 100)]),
    ),
    scenarioImpacts: Object.fromEntries(
      state.scenarios.map((scenario) => [scenario.id, clamp(number(suppliedImpacts[scenario.id], 0), -40, 40)]),
    ),
    assumptionExposure: Object.fromEntries(
      state.assumptions.map((assumption) => [assumption.id, clamp(number(suppliedExposures[assumption.id], 40), 0, 100)]),
    ),
  }

  return { ...state, options: [...state.options, option], selectedOptionId: id }
}

function applyProposal(state: DecisionState, proposal: Proposal): DecisionState {
  const payload = proposal.payload

  switch (proposal.kind) {
    case 'option':
      return addOption(state, payload)
    case 'criterion':
      return addCriterion(state, payload)
    case 'assumption':
      return addAssumption(state, payload)
    case 'scenario':
      return addScenario(state, payload)
    case 'score-change': {
      const optionId = text(payload.option_id)
      const criterionId = text(payload.criterion_id)
      const value = clamp(number(payload.score, 50), 0, 100)
      return {
        ...state,
        options: state.options.map((option) =>
          option.id === optionId
            ? { ...option, scores: { ...option.scores, [criterionId]: value } }
            : option,
        ),
      }
    }
    case 'assumption-challenge': {
      const assumptionId = text(payload.assumption_id)
      return {
        ...state,
        assumptions: state.assumptions.map((assumption) =>
          assumption.id === assumptionId
            ? {
                ...assumption,
                challenged: true,
                counterpoint: text(payload.counterpoint, 'The agent challenged this assumption.'),
                confidence: clamp(number(payload.revised_confidence, assumption.confidence), 0, 100),
              }
            : assumption,
        ),
      }
    }
    case 'commitment': {
      const optionId = text(payload.option_id)
      return {
        ...state,
        commitment: {
          optionId,
          statement: text(payload.statement, 'Proceed with the selected option under explicit guardrails.'),
          guardrails: stringArray(payload.guardrails).slice(0, 8),
          reviewDate: text(payload.review_date, 'After the first implementation checkpoint'),
          createdAt: now(),
        },
      }
    }
  }
}

export function createProposal(input: ProposalInput, createdAt = now()): Proposal {
  return {
    id: uid('proposal'),
    kind: input.kind,
    title: input.title,
    rationale: input.rationale,
    payload: input.payload,
    ...(input.basedOnRevision !== undefined ? { basedOnRevision: input.basedOnRevision } : {}),
    createdAt,
    status: 'pending',
  }
}

export function reduceDecision(state: DecisionState, action: DecisionAction): DecisionState {
  switch (action.type) {
    case 'set-view':
      return { ...state, activeView: action.view }
    case 'select-option':
      return { ...state, selectedOptionId: action.optionId }
    case 'set-risk-aversion':
      return update(
        state,
        { riskAversion: clamp(action.value, 0, 1) },
        createActivity('human', 'caution-updated', `Decision caution set to ${Math.round(clamp(action.value, 0, 1) * 100)}%.`),
      )
    case 'set-criterion-weight': {
      const criterion = state.criteria.find((candidate) => candidate.id === action.criterionId)
      if (!criterion) return state
      const criteria = redistribute(
        state.criteria,
        action.criterionId,
        action.value,
        (candidate) => candidate.weight,
        (candidate, value) => ({ ...candidate, weight: value }),
      )
      return update(
        state,
        { criteria },
        createActivity('human', 'criterion-reweighted', `${criterion.name} reweighted to ${Math.round(clamp(action.value, 0, 100))}%.`, criterion.id),
      )
    }
    case 'set-option-score': {
      const option = state.options.find((candidate) => candidate.id === action.optionId)
      const criterion = state.criteria.find((candidate) => candidate.id === action.criterionId)
      if (!option || !criterion) return state
      const value = clamp(action.value, 0, 100)
      const options = state.options.map((candidate) =>
        candidate.id === option.id
          ? { ...candidate, scores: { ...candidate.scores, [criterion.id]: value } }
          : candidate,
      )
      return update(
        state,
        { options },
        createActivity('human', 'score-updated', `${option.name} · ${criterion.name} set to ${Math.round(value)}.`, option.id),
      )
    }
    case 'set-scenario-probability': {
      const scenario = state.scenarios.find((candidate) => candidate.id === action.scenarioId)
      if (!scenario) return state
      const scenarios = redistribute(
        state.scenarios,
        action.scenarioId,
        action.value,
        (candidate) => candidate.probability,
        (candidate, value) => ({ ...candidate, probability: value }),
      )
      return update(
        state,
        { scenarios },
        createActivity('human', 'future-reweighted', `${scenario.name} probability set to ${Math.round(clamp(action.value, 0, 100))}%.`, scenario.id),
      )
    }
    case 'add-proposal':
      return update(
        state,
        { proposals: [action.proposal, ...state.proposals].slice(0, MAX_PROPOSALS) },
        createActivity('agent', 'proposal-staged', `Agent staged: ${action.proposal.title}.`, action.proposal.id),
      )
    case 'review-proposal': {
      const proposal = state.proposals.find((candidate) => candidate.id === action.proposalId)
      if (!proposal || proposal.status !== 'pending') return state
      const reviewedAt = now()
      const proposals = state.proposals.map((candidate) =>
        candidate.id === proposal.id ? { ...candidate, status: action.status, reviewedAt } : candidate,
      )
      const applied = action.status === 'approved' ? applyProposal({ ...state, proposals }, proposal) : { ...state, proposals }
      return update(
        applied,
        {},
        createActivity(
          'human',
          `proposal-${action.status}`,
          `${action.status === 'approved' ? 'Approved' : 'Rejected'} agent proposal: ${proposal.title}.`,
          proposal.id,
        ),
      )
    }
    case 'set-guided-step':
      return { ...state, guidedStep: Math.max(0, Math.floor(action.step)) }
    case 'load':
      return { ...action.state, updatedAt: now() }
    case 'reset':
      return { ...action.state, updatedAt: now() }
  }
}

export { isDecisionState } from './validation'

export function proposalFromUnknown(value: unknown): Proposal | null {
  const payload = record(value)
  const kind = text(payload.kind)
  const allowedKinds = [
    'option',
    'criterion',
    'assumption',
    'scenario',
    'score-change',
    'assumption-challenge',
    'commitment',
  ]
  if (!allowedKinds.includes(kind)) return null

  return createProposal({
    kind: kind as Proposal['kind'],
    title: text(payload.title, 'Agent proposal'),
    rationale: text(payload.rationale, 'No rationale provided.'),
    payload: record(payload.payload),
  })
}

export { boolean }
