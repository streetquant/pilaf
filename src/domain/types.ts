export type Actor = 'human' | 'agent' | 'system'
export type ViewId = 'map' | 'matrix' | 'futures' | 'audit'
export type CriterionDirection = 'benefit' | 'cost'
export type ProposalStatus = 'pending' | 'approved' | 'rejected'
export type ToolEffect = 'none' | 'presentation-only' | 'proposal-staged'
export type ProposalKind =
  | 'option'
  | 'criterion'
  | 'assumption'
  | 'scenario'
  | 'score-change'
  | 'assumption-challenge'
  | 'commitment'

export interface Criterion {
  id: string
  name: string
  description: string
  weight: number
  direction: CriterionDirection
  unit?: string
}

export interface Option {
  id: string
  name: string
  description: string
  thesis: string
  scores: Record<string, number>
  scenarioImpacts: Record<string, number>
  assumptionExposure: Record<string, number>
}

export interface Scenario {
  id: string
  name: string
  description: string
  probability: number
  severity: 'low' | 'medium' | 'high' | 'extreme'
}

export interface Assumption {
  id: string
  statement: string
  confidence: number
  impact: number
  evidence: string
  challenged: boolean
  counterpoint?: string
}

export interface Proposal {
  id: string
  kind: ProposalKind
  title: string
  rationale: string
  payload: Record<string, unknown>
  basedOnRevision?: number
  createdAt: string
  status: ProposalStatus
  reviewedAt?: string
}

export interface Activity {
  id: string
  actor: Actor
  kind: string
  message: string
  at: string
  entityId?: string
}

export interface Commitment {
  optionId: string
  statement: string
  guardrails: string[]
  reviewDate: string
  createdAt: string
}

export interface DecisionState {
  schemaVersion: 1
  id: string
  title: string
  question: string
  context: string
  horizon: string
  budget: string
  constraints: string[]
  criteria: Criterion[]
  options: Option[]
  scenarios: Scenario[]
  assumptions: Assumption[]
  proposals: Proposal[]
  activity: Activity[]
  riskAversion: number
  activeView: ViewId
  selectedOptionId: string | null
  commitment: Commitment | null
  guidedStep: number
  revision: number
  updatedAt: string
}

export interface ScenarioScore {
  scenarioId: string
  score: number
  impact: number
}

export interface OptionAnalysis {
  optionId: string
  baseScore: number
  scenarioAdjustment: number
  assumptionPenalty: number
  scenarioDispersion: number
  robustScore: number
  worstCaseScore: number
  regret: number
  confidence: number
  rank: number
  scenarioScores: ScenarioScore[]
}

export interface AssumptionRisk {
  assumptionId: string
  risk: number
  confidence: number
  impact: number
  affectedOptions: string[]
}

export interface RankReversal {
  criterionId: string
  criterionName: string
  direction: 'increase' | 'decrease'
  delta: number
  fromWinnerId: string
  toWinnerId: string
}

export interface DecisionAnalysis {
  generatedAt: string
  ranking: OptionAnalysis[]
  winnerId: string | null
  runnerUpId: string | null
  lead: number
  weakAssumptions: AssumptionRisk[]
  rankReversals: RankReversal[]
  normalizedWeights: Record<string, number>
  normalizedProbabilities: Record<string, number>
}

export interface ProposalInput {
  kind: ProposalKind
  title: string
  rationale: string
  payload: Record<string, unknown>
  basedOnRevision?: number
}

export type DecisionAction =
  | { type: 'set-view'; view: ViewId; actor?: Actor }
  | { type: 'select-option'; optionId: string | null }
  | { type: 'set-risk-aversion'; value: number }
  | { type: 'set-criterion-weight'; criterionId: string; value: number }
  | { type: 'set-option-score'; optionId: string; criterionId: string; value: number }
  | { type: 'set-scenario-probability'; scenarioId: string; value: number }
  | { type: 'add-proposal'; proposal: Proposal }
  | { type: 'review-proposal'; proposalId: string; status: 'approved' | 'rejected' }
  | { type: 'set-guided-step'; step: number }
  | { type: 'load'; state: DecisionState }
  | { type: 'reset'; state: DecisionState }

export interface WebMcpInvocation {
  id: string
  tool: string
  mode: 'read' | 'proposal' | 'navigation'
  effect: ToolEffect
  modelRevisionBefore: number
  modelRevisionAfter: number
  stateChanged: boolean
  summary: string
  at: string
  ok: boolean
}

export interface RegisteredToolSummary {
  name: string
  description: string
  mode: 'read' | 'proposal' | 'navigation'
  readOnly: boolean
  consequential: boolean
}
