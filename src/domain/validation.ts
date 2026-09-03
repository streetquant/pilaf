import type { DecisionState } from './types'

const MAX_ERRORS = 50
const LIMITS = {
  constraints: 24,
  criteria: 24,
  options: 32,
  scenarios: 20,
  assumptions: 48,
  proposals: 40,
  activity: 120,
  payloadBytes: 24_000,
} as const

const ACTORS = new Set(['human', 'agent', 'system'])
const VIEWS = new Set(['map', 'matrix', 'futures', 'audit'])
const DIRECTIONS = new Set(['benefit', 'cost'])
const SEVERITIES = new Set(['low', 'medium', 'high', 'extreme'])
const PROPOSAL_KINDS = new Set([
  'option',
  'criterion',
  'assumption',
  'scenario',
  'score-change',
  'assumption-challenge',
  'commitment',
])
const PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected'])

const ROOT_KEYS = new Set([
  'schemaVersion',
  'id',
  'title',
  'question',
  'context',
  'horizon',
  'budget',
  'constraints',
  'criteria',
  'options',
  'scenarios',
  'assumptions',
  'proposals',
  'activity',
  'riskAversion',
  'activeView',
  'selectedOptionId',
  'commitment',
  'guidedStep',
  'revision',
  'updatedAt',
])

export interface DecisionStateValidation {
  valid: boolean
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addError(errors: string[], path: string, message: string): void {
  if (errors.length >= MAX_ERRORS) return
  errors.push(`${path}: ${message}`)
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  path: string,
  allowed: ReadonlySet<string>,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addError(errors, `${path}.${key}`, 'is not a recognized field')
  }
}

function validateString(
  value: unknown,
  path: string,
  errors: string[],
  options: { min?: number; max: number; optional?: boolean } = { max: 500 },
): value is string {
  if (value === undefined && options.optional) return true
  if (typeof value !== 'string') {
    addError(errors, path, 'must be a string')
    return false
  }
  const minimum = options.min ?? 1
  if (value.trim().length < minimum || value.length > options.max) {
    addError(errors, path, `must contain ${minimum}–${options.max} characters`)
    return false
  }
  return true
}

function validateFiniteNumber(
  value: unknown,
  path: string,
  errors: string[],
  minimum: number,
  maximum: number,
  integer = false,
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addError(errors, path, 'must be a finite number')
    return false
  }
  if (value < minimum || value > maximum) {
    addError(errors, path, `must be between ${minimum} and ${maximum}`)
    return false
  }
  if (integer && !Number.isInteger(value)) {
    addError(errors, path, 'must be an integer')
    return false
  }
  return true
}

function validateIsoDate(value: unknown, path: string, errors: string[], optional = false): value is string {
  if (value === undefined && optional) return true
  if (!validateString(value, path, errors, { max: 64 })) return false
  if (Number.isNaN(Date.parse(value))) {
    addError(errors, path, 'must be a parseable timestamp')
    return false
  }
  return true
}

function validateArray(
  value: unknown,
  path: string,
  errors: string[],
  maximum: number,
  minimum = 0,
): value is unknown[] {
  if (!Array.isArray(value)) {
    addError(errors, path, 'must be an array')
    return false
  }
  if (value.length < minimum || value.length > maximum) {
    addError(errors, path, `must contain ${minimum}–${maximum} entries`)
    return false
  }
  return true
}

function validateUniqueIds(values: unknown[], path: string, errors: string[]): Set<string> {
  const ids = new Set<string>()
  values.forEach((value, index) => {
    if (!isRecord(value)) return
    const id = value.id
    if (!validateString(id, `${path}[${index}].id`, errors, { max: 80 })) return
    if (ids.has(id)) addError(errors, `${path}[${index}].id`, `duplicate identifier “${id}”`)
    ids.add(id)
  })
  return ids
}

function validateNumberRecord(
  value: unknown,
  path: string,
  errors: string[],
  expectedIds: Set<string>,
  minimum: number,
  maximum: number,
  requireEveryId = true,
): void {
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object keyed by current entity IDs')
    return
  }

  if (requireEveryId) {
    for (const id of expectedIds) {
      if (!(id in value)) addError(errors, path, `is missing key “${id}”`)
    }
  }
  for (const [id, entry] of Object.entries(value)) {
    if (!expectedIds.has(id)) addError(errors, `${path}.${id}`, 'references an unknown entity')
    validateFiniteNumber(entry, `${path}.${id}`, errors, minimum, maximum)
  }
}

function validateCriterion(value: unknown, index: number, errors: string[]): void {
  const path = `criteria[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(value, path, new Set(['id', 'name', 'description', 'weight', 'direction', 'unit']), errors)
  validateString(value.id, `${path}.id`, errors, { max: 80 })
  validateString(value.name, `${path}.name`, errors, { max: 120 })
  validateString(value.description, `${path}.description`, errors, { max: 800 })
  validateFiniteNumber(value.weight, `${path}.weight`, errors, 0, 100)
  if (typeof value.direction !== 'string' || !DIRECTIONS.has(value.direction)) {
    addError(errors, `${path}.direction`, 'must be benefit or cost')
  }
  validateString(value.unit, `${path}.unit`, errors, { max: 160, optional: true })
}

function validateScenario(value: unknown, index: number, errors: string[]): void {
  const path = `scenarios[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(value, path, new Set(['id', 'name', 'description', 'probability', 'severity']), errors)
  validateString(value.id, `${path}.id`, errors, { max: 80 })
  validateString(value.name, `${path}.name`, errors, { max: 140 })
  validateString(value.description, `${path}.description`, errors, { max: 800 })
  validateFiniteNumber(value.probability, `${path}.probability`, errors, 0, 100)
  if (typeof value.severity !== 'string' || !SEVERITIES.has(value.severity)) {
    addError(errors, `${path}.severity`, 'must be low, medium, high, or extreme')
  }
}

function validateAssumption(value: unknown, index: number, errors: string[]): void {
  const path = `assumptions[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(
    value,
    path,
    new Set(['id', 'statement', 'confidence', 'impact', 'evidence', 'challenged', 'counterpoint']),
    errors,
  )
  validateString(value.id, `${path}.id`, errors, { max: 80 })
  validateString(value.statement, `${path}.statement`, errors, { max: 800 })
  validateFiniteNumber(value.confidence, `${path}.confidence`, errors, 0, 100)
  validateFiniteNumber(value.impact, `${path}.impact`, errors, 0, 100)
  validateString(value.evidence, `${path}.evidence`, errors, { max: 1_500 })
  if (typeof value.challenged !== 'boolean') addError(errors, `${path}.challenged`, 'must be boolean')
  validateString(value.counterpoint, `${path}.counterpoint`, errors, { max: 1_500, optional: true })
}

function validateOption(
  value: unknown,
  index: number,
  errors: string[],
  criterionIds: Set<string>,
  scenarioIds: Set<string>,
  assumptionIds: Set<string>,
): void {
  const path = `options[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(
    value,
    path,
    new Set(['id', 'name', 'description', 'thesis', 'scores', 'scenarioImpacts', 'assumptionExposure']),
    errors,
  )
  validateString(value.id, `${path}.id`, errors, { max: 80 })
  validateString(value.name, `${path}.name`, errors, { max: 140 })
  validateString(value.description, `${path}.description`, errors, { max: 1_000 })
  validateString(value.thesis, `${path}.thesis`, errors, { max: 600 })
  validateNumberRecord(value.scores, `${path}.scores`, errors, criterionIds, 0, 100)
  validateNumberRecord(value.scenarioImpacts, `${path}.scenarioImpacts`, errors, scenarioIds, -40, 40)
  validateNumberRecord(value.assumptionExposure, `${path}.assumptionExposure`, errors, assumptionIds, 0, 100)
}

function validateProposalPayload(
  kind: string,
  payload: Record<string, unknown>,
  path: string,
  errors: string[],
  criterionIds: Set<string>,
  scenarioIds: Set<string>,
  assumptionIds: Set<string>,
  optionIds: Set<string>,
): void {
  switch (kind) {
    case 'option':
      validateString(payload.name, `${path}.name`, errors, { max: 80 })
      validateString(payload.description, `${path}.description`, errors, { max: 400 })
      validateString(payload.thesis, `${path}.thesis`, errors, { max: 240 })
      validateNumberRecord(payload.scores, `${path}.scores`, errors, criterionIds, 0, 100, false)
      validateNumberRecord(payload.scenario_impacts, `${path}.scenario_impacts`, errors, scenarioIds, -40, 40, false)
      validateNumberRecord(payload.assumption_exposure, `${path}.assumption_exposure`, errors, assumptionIds, 0, 100, false)
      break
    case 'criterion':
      validateString(payload.name, `${path}.name`, errors, { max: 80 })
      validateString(payload.description, `${path}.description`, errors, { max: 360 })
      validateFiniteNumber(payload.weight, `${path}.weight`, errors, 1, 60)
      if (typeof payload.direction !== 'string' || !DIRECTIONS.has(payload.direction)) {
        addError(errors, `${path}.direction`, 'must be benefit or cost')
      }
      validateString(payload.unit, `${path}.unit`, errors, { max: 120 })
      validateFiniteNumber(payload.default_score, `${path}.default_score`, errors, 0, 100)
      break
    case 'assumption':
      validateString(payload.statement, `${path}.statement`, errors, { max: 360 })
      validateFiniteNumber(payload.confidence, `${path}.confidence`, errors, 0, 100)
      validateFiniteNumber(payload.impact, `${path}.impact`, errors, 0, 100)
      validateString(payload.evidence, `${path}.evidence`, errors, { max: 500 })
      validateNumberRecord(payload.exposure_by_option, `${path}.exposure_by_option`, errors, optionIds, 0, 100, false)
      break
    case 'scenario':
      validateString(payload.name, `${path}.name`, errors, { max: 100 })
      validateString(payload.description, `${path}.description`, errors, { max: 400 })
      validateFiniteNumber(payload.probability, `${path}.probability`, errors, 1, 60)
      if (typeof payload.severity !== 'string' || !SEVERITIES.has(payload.severity)) {
        addError(errors, `${path}.severity`, 'must be low, medium, high, or extreme')
      }
      validateNumberRecord(payload.impact_by_option, `${path}.impact_by_option`, errors, optionIds, -40, 40, false)
      break
    case 'score-change': {
      const optionId = payload.option_id
      const criterionId = payload.criterion_id
      if (validateString(optionId, `${path}.option_id`, errors, { max: 80 }) && !optionIds.has(optionId)) {
        addError(errors, `${path}.option_id`, 'must reference an existing option')
      }
      if (validateString(criterionId, `${path}.criterion_id`, errors, { max: 80 }) && !criterionIds.has(criterionId)) {
        addError(errors, `${path}.criterion_id`, 'must reference an existing criterion')
      }
      validateFiniteNumber(payload.score, `${path}.score`, errors, 0, 100)
      validateString(payload.evidence, `${path}.evidence`, errors, { max: 500 })
      validateFiniteNumber(payload.previous_score, `${path}.previous_score`, errors, 0, 100)
      break
    }
    case 'assumption-challenge': {
      const assumptionId = payload.assumption_id
      if (validateString(assumptionId, `${path}.assumption_id`, errors, { max: 80 }) && !assumptionIds.has(assumptionId)) {
        addError(errors, `${path}.assumption_id`, 'must reference an existing assumption')
      }
      validateString(payload.counterpoint, `${path}.counterpoint`, errors, { max: 600 })
      if (payload.revised_confidence !== undefined) {
        validateFiniteNumber(payload.revised_confidence, `${path}.revised_confidence`, errors, 0, 100)
      }
      validateString(payload.test, `${path}.test`, errors, { max: 400 })
      validateFiniteNumber(payload.previous_confidence, `${path}.previous_confidence`, errors, 0, 100)
      break
    }
    case 'commitment': {
      const optionId = payload.option_id
      if (validateString(optionId, `${path}.option_id`, errors, { max: 80 }) && !optionIds.has(optionId)) {
        addError(errors, `${path}.option_id`, 'must reference an existing option')
      }
      validateString(payload.statement, `${path}.statement`, errors, { max: 500 })
      if (validateArray(payload.guardrails, `${path}.guardrails`, errors, 8, 1)) {
        payload.guardrails.forEach((guardrail, index) => {
          validateString(guardrail, `${path}.guardrails[${index}]`, errors, { max: 240 })
        })
      }
      validateString(payload.review_date, `${path}.review_date`, errors, { max: 120 })
      break
    }
    default:
      break
  }
}

function validateProposal(
  value: unknown,
  index: number,
  errors: string[],
  criterionIds: Set<string>,
  scenarioIds: Set<string>,
  assumptionIds: Set<string>,
  optionIds: Set<string>,
): void {
  const path = `proposals[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(
    value,
    path,
    new Set(['id', 'kind', 'title', 'rationale', 'payload', 'basedOnRevision', 'createdAt', 'status', 'reviewedAt']),
    errors,
  )
  validateString(value.id, `${path}.id`, errors, { max: 100 })
  const validKind = typeof value.kind === 'string' && PROPOSAL_KINDS.has(value.kind)
  if (!validKind) addError(errors, `${path}.kind`, 'is not a supported proposal kind')
  validateString(value.title, `${path}.title`, errors, { max: 220 })
  validateString(value.rationale, `${path}.rationale`, errors, { max: 1_500 })
  if (!isRecord(value.payload)) {
    addError(errors, `${path}.payload`, 'must be an object')
  } else {
    try {
      const serialized = JSON.stringify(value.payload)
      if (new TextEncoder().encode(serialized).byteLength > LIMITS.payloadBytes) {
        addError(errors, `${path}.payload`, `must be at most ${LIMITS.payloadBytes} serialized bytes`)
      }
      if (validKind) {
        validateProposalPayload(
          value.kind as string,
          value.payload,
          `${path}.payload`,
          errors,
          criterionIds,
          scenarioIds,
          assumptionIds,
          optionIds,
        )
      }
    } catch {
      addError(errors, `${path}.payload`, 'must be JSON-serializable')
    }
  }
  const validStatus = typeof value.status === 'string' && PROPOSAL_STATUSES.has(value.status)
  if (!validStatus) addError(errors, `${path}.status`, 'must be pending, approved, or rejected')
  validateIsoDate(value.createdAt, `${path}.createdAt`, errors)
  if (value.basedOnRevision !== undefined) {
    validateFiniteNumber(value.basedOnRevision, `${path}.basedOnRevision`, errors, 1, Number.MAX_SAFE_INTEGER, true)
  }
  if (value.status === 'pending') {
    if (value.reviewedAt !== undefined) addError(errors, `${path}.reviewedAt`, 'must be absent while status is pending')
  } else if (validStatus) {
    validateIsoDate(value.reviewedAt, `${path}.reviewedAt`, errors)
  }
}

function validateActivity(value: unknown, index: number, errors: string[]): void {
  const path = `activity[${index}]`
  if (!isRecord(value)) {
    addError(errors, path, 'must be an object')
    return
  }
  rejectUnknownKeys(value, path, new Set(['id', 'actor', 'kind', 'message', 'at', 'entityId']), errors)
  validateString(value.id, `${path}.id`, errors, { max: 100 })
  if (typeof value.actor !== 'string' || !ACTORS.has(value.actor)) {
    addError(errors, `${path}.actor`, 'must be human, agent, or system')
  }
  validateString(value.kind, `${path}.kind`, errors, { max: 100 })
  validateString(value.message, `${path}.message`, errors, { max: 1_500 })
  validateIsoDate(value.at, `${path}.at`, errors)
  validateString(value.entityId, `${path}.entityId`, errors, { max: 100, optional: true })
}

function validateCommitment(value: unknown, errors: string[], optionIds: Set<string>): void {
  if (value === null) return
  if (!isRecord(value)) {
    addError(errors, 'commitment', 'must be null or an object')
    return
  }
  rejectUnknownKeys(value, 'commitment', new Set(['optionId', 'statement', 'guardrails', 'reviewDate', 'createdAt']), errors)
  if (validateString(value.optionId, 'commitment.optionId', errors, { max: 80 }) && !optionIds.has(value.optionId)) {
    addError(errors, 'commitment.optionId', 'must reference an existing option')
  }
  validateString(value.statement, 'commitment.statement', errors, { max: 1_000 })
  if (validateArray(value.guardrails, 'commitment.guardrails', errors, 8, 1)) {
    value.guardrails.forEach((guardrail, index) => {
      validateString(guardrail, `commitment.guardrails[${index}]`, errors, { max: 400 })
    })
  }
  validateString(value.reviewDate, 'commitment.reviewDate', errors, { max: 180 })
  validateIsoDate(value.createdAt, 'commitment.createdAt', errors)
}

export function validateDecisionState(value: unknown): DecisionStateValidation {
  const errors: string[] = []
  if (!isRecord(value)) return { valid: false, errors: ['root: must be an object'] }
  rejectUnknownKeys(value, 'root', ROOT_KEYS, errors)

  if (value.schemaVersion !== 1) addError(errors, 'schemaVersion', 'must equal 1')
  validateString(value.id, 'id', errors, { max: 100 })
  validateString(value.title, 'title', errors, { max: 200 })
  validateString(value.question, 'question', errors, { max: 1_000 })
  validateString(value.context, 'context', errors, { max: 4_000 })
  validateString(value.horizon, 'horizon', errors, { max: 400 })
  validateString(value.budget, 'budget', errors, { max: 240 })

  if (validateArray(value.constraints, 'constraints', errors, LIMITS.constraints)) {
    value.constraints.forEach((constraint, index) => {
      validateString(constraint, `constraints[${index}]`, errors, { max: 600 })
    })
  }

  const criteria = validateArray(value.criteria, 'criteria', errors, LIMITS.criteria, 1) ? value.criteria : []
  const scenarios = validateArray(value.scenarios, 'scenarios', errors, LIMITS.scenarios) ? value.scenarios : []
  const assumptions = validateArray(value.assumptions, 'assumptions', errors, LIMITS.assumptions) ? value.assumptions : []
  const options = validateArray(value.options, 'options', errors, LIMITS.options, 1) ? value.options : []
  const proposals = validateArray(value.proposals, 'proposals', errors, LIMITS.proposals) ? value.proposals : []
  const activity = validateArray(value.activity, 'activity', errors, LIMITS.activity) ? value.activity : []

  const criterionIds = validateUniqueIds(criteria, 'criteria', errors)
  const scenarioIds = validateUniqueIds(scenarios, 'scenarios', errors)
  const assumptionIds = validateUniqueIds(assumptions, 'assumptions', errors)
  const optionIds = validateUniqueIds(options, 'options', errors)
  validateUniqueIds(proposals, 'proposals', errors)
  validateUniqueIds(activity, 'activity', errors)

  criteria.forEach((criterion, index) => validateCriterion(criterion, index, errors))
  scenarios.forEach((scenario, index) => validateScenario(scenario, index, errors))
  assumptions.forEach((assumption, index) => validateAssumption(assumption, index, errors))
  options.forEach((option, index) => validateOption(option, index, errors, criterionIds, scenarioIds, assumptionIds))
  proposals.forEach((proposal, index) => {
    validateProposal(proposal, index, errors, criterionIds, scenarioIds, assumptionIds, optionIds)
  })
  activity.forEach((entry, index) => validateActivity(entry, index, errors))

  const weightTotal = criteria.reduce<number>((sum, candidate) => {
    return isRecord(candidate) && typeof candidate.weight === 'number' && Number.isFinite(candidate.weight)
      ? sum + Math.max(0, candidate.weight)
      : sum
  }, 0)
  if (criteria.length > 0 && weightTotal <= 0) addError(errors, 'criteria', 'must contain at least one positive weight')

  const probabilityTotal = scenarios.reduce<number>((sum, candidate) => {
    return isRecord(candidate) && typeof candidate.probability === 'number' && Number.isFinite(candidate.probability)
      ? sum + Math.max(0, candidate.probability)
      : sum
  }, 0)
  if (scenarios.length > 0 && probabilityTotal <= 0) addError(errors, 'scenarios', 'must contain at least one positive probability')

  validateFiniteNumber(value.riskAversion, 'riskAversion', errors, 0, 1)
  if (typeof value.activeView !== 'string' || !VIEWS.has(value.activeView)) {
    addError(errors, 'activeView', 'must be map, matrix, futures, or audit')
  }
  if (value.selectedOptionId !== null) {
    if (validateString(value.selectedOptionId, 'selectedOptionId', errors, { max: 80 }) && !optionIds.has(value.selectedOptionId)) {
      addError(errors, 'selectedOptionId', 'must reference an existing option')
    }
  }
  validateCommitment(value.commitment, errors, optionIds)
  validateFiniteNumber(value.guidedStep, 'guidedStep', errors, 0, 10_000, true)
  const revision = value.revision
  const validRevision = validateFiniteNumber(revision, 'revision', errors, 1, Number.MAX_SAFE_INTEGER, true)
  if (validRevision) {
    proposals.forEach((proposal, index) => {
      if (
        isRecord(proposal) &&
        typeof proposal.basedOnRevision === 'number' &&
        Number.isFinite(proposal.basedOnRevision) &&
        proposal.basedOnRevision > revision
      ) {
        addError(errors, `proposals[${index}].basedOnRevision`, 'cannot be newer than the snapshot revision')
      }
    })
  }
  validateIsoDate(value.updatedAt, 'updatedAt', errors)

  return { valid: errors.length === 0, errors }
}

export function assertDecisionState(value: unknown): DecisionState {
  const validation = validateDecisionState(value)
  if (!validation.valid) {
    const details = validation.errors.slice(0, 6).join('; ')
    const remainder = validation.errors.length > 6 ? `; plus ${validation.errors.length - 6} more error(s)` : ''
    throw new TypeError(`Invalid ForkRoom snapshot: ${details}${remainder}`)
  }
  return value as DecisionState
}

export function isDecisionState(value: unknown): value is DecisionState {
  return validateDecisionState(value).valid
}

export const decisionStateLimits = LIMITS
