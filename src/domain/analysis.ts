import type {
  AssumptionRisk,
  DecisionAnalysis,
  DecisionState,
  Option,
  OptionAnalysis,
  RankReversal,
} from './types'

const ASSUMPTION_PENALTY_SCALE = 18
const DISPERSION_PENALTY_SCALE = 0.75
const SENSITIVITY_DELTA = 15

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function normalizeMap(entries: Array<{ id: string; value: number }>): Record<string, number> {
  if (entries.length === 0) return {}

  const positiveEntries = entries.map(({ id, value }) => ({ id, value: Math.max(0, value) }))
  const total = positiveEntries.reduce((sum, entry) => sum + entry.value, 0)

  if (total <= 0) {
    const equalShare = 1 / positiveEntries.length
    return Object.fromEntries(positiveEntries.map((entry) => [entry.id, equalShare]))
  }

  return Object.fromEntries(positiveEntries.map((entry) => [entry.id, entry.value / total]))
}

export function normalizeWeights(state: DecisionState): Record<string, number> {
  return normalizeMap(state.criteria.map((criterion) => ({ id: criterion.id, value: criterion.weight })))
}

export function normalizeProbabilities(state: DecisionState): Record<string, number> {
  return normalizeMap(state.scenarios.map((scenario) => ({ id: scenario.id, value: scenario.probability })))
}

function criterionValue(option: Option, criterionId: string, direction: 'benefit' | 'cost'): number {
  const raw = clamp(option.scores[criterionId] ?? 50, 0, 100)
  return direction === 'cost' ? 100 - raw : raw
}

function calculateOption(
  state: DecisionState,
  option: Option,
  weights: Record<string, number>,
  probabilities: Record<string, number>,
): Omit<OptionAnalysis, 'regret' | 'rank'> {
  const baseScore = state.criteria.reduce((sum, criterion) => {
    return sum + (weights[criterion.id] ?? 0) * criterionValue(option, criterion.id, criterion.direction)
  }, 0)

  const scenarioScores = state.scenarios.map((scenario) => {
    const impact = clamp(option.scenarioImpacts[scenario.id] ?? 0, -40, 40)
    return {
      scenarioId: scenario.id,
      impact,
      score: clamp(baseScore + impact, 0, 100),
    }
  })

  const scenarioAdjustment = scenarioScores.reduce((sum, scenarioScore) => {
    return sum + (probabilities[scenarioScore.scenarioId] ?? 0) * scenarioScore.impact
  }, 0)

  const scenarioVariance = scenarioScores.reduce((sum, scenarioScore) => {
    const deviation = scenarioScore.impact - scenarioAdjustment
    return sum + (probabilities[scenarioScore.scenarioId] ?? 0) * deviation ** 2
  }, 0)
  const scenarioDispersion = Math.sqrt(Math.max(0, scenarioVariance))

  const assumptionPenalty = state.assumptions.reduce((sum, assumption) => {
    const uncertainty = 1 - clamp(assumption.confidence, 0, 100) / 100
    const impact = clamp(assumption.impact, 0, 100) / 100
    const exposure = clamp(Math.abs(option.assumptionExposure[assumption.id] ?? 0), 0, 100) / 100
    return sum + uncertainty * impact * exposure * ASSUMPTION_PENALTY_SCALE
  }, 0)

  const caution = clamp(state.riskAversion, 0, 1)
  const robustScore = clamp(
    baseScore +
      scenarioAdjustment -
      caution * (assumptionPenalty + scenarioDispersion * DISPERSION_PENALTY_SCALE),
    0,
    100,
  )
  const worstImpact = scenarioScores.length > 0 ? Math.min(...scenarioScores.map((score) => score.impact)) : 0
  const worstCaseScore = clamp(baseScore + worstImpact - caution * assumptionPenalty, 0, 100)
  const confidence = clamp(100 - assumptionPenalty * 3 - scenarioDispersion * 2, 10, 99)

  return {
    optionId: option.id,
    baseScore: round(baseScore),
    scenarioAdjustment: round(scenarioAdjustment),
    assumptionPenalty: round(assumptionPenalty),
    scenarioDispersion: round(scenarioDispersion),
    robustScore: round(robustScore),
    worstCaseScore: round(worstCaseScore),
    confidence: round(confidence),
    scenarioScores: scenarioScores.map((score) => ({ ...score, score: round(score.score), impact: round(score.impact) })),
  }
}

function rankOptions(
  state: DecisionState,
  weights: Record<string, number>,
  probabilities: Record<string, number>,
): OptionAnalysis[] {
  const provisional = state.options
    .map((option) => calculateOption(state, option, weights, probabilities))
    .sort((left, right) => {
      if (right.robustScore !== left.robustScore) return right.robustScore - left.robustScore
      if (right.worstCaseScore !== left.worstCaseScore) return right.worstCaseScore - left.worstCaseScore
      return left.optionId.localeCompare(right.optionId)
    })

  const topScore = provisional[0]?.robustScore ?? 0
  return provisional.map((option, index) => ({
    ...option,
    rank: index + 1,
    regret: round(Math.max(0, topScore - option.robustScore)),
  }))
}

function findWeakAssumptions(state: DecisionState): AssumptionRisk[] {
  return state.assumptions
    .map((assumption) => {
      const uncertainty = 1 - clamp(assumption.confidence, 0, 100) / 100
      const affected = state.options
        .map((option) => ({ optionId: option.id, exposure: clamp(option.assumptionExposure[assumption.id] ?? 0, 0, 100) }))
        .filter(({ exposure }) => exposure >= 40)
        .sort((left, right) => right.exposure - left.exposure)
      const maximumExposure = Math.max(0, ...affected.map(({ exposure }) => exposure)) / 100
      const risk = uncertainty * (clamp(assumption.impact, 0, 100) / 100) * maximumExposure * 100

      return {
        assumptionId: assumption.id,
        risk: round(risk),
        confidence: round(clamp(assumption.confidence, 0, 100)),
        impact: round(clamp(assumption.impact, 0, 100)),
        affectedOptions: affected.map(({ optionId }) => optionId),
      }
    })
    .sort((left, right) => right.risk - left.risk)
}

function findRankReversals(
  state: DecisionState,
  baselineWinnerId: string | null,
  baselineWeights: Record<string, number>,
  probabilities: Record<string, number>,
): RankReversal[] {
  if (!baselineWinnerId) return []

  const reversals: RankReversal[] = []

  for (const criterion of state.criteria) {
    for (const direction of ['increase', 'decrease'] as const) {
      const adjustedValue = clamp(
        criterion.weight + (direction === 'increase' ? SENSITIVITY_DELTA : -SENSITIVITY_DELTA),
        0,
        100,
      )
      const adjustedWeights = normalizeMap(
        state.criteria.map((candidate) => ({
          id: candidate.id,
          value: candidate.id === criterion.id ? adjustedValue : candidate.weight,
        })),
      )
      const winnerId = rankOptions(state, adjustedWeights, probabilities)[0]?.optionId ?? null

      if (winnerId && winnerId !== baselineWinnerId) {
        reversals.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          direction,
          delta: round(Math.abs((adjustedWeights[criterion.id] ?? 0) - (baselineWeights[criterion.id] ?? 0)) * 100),
          fromWinnerId: baselineWinnerId,
          toWinnerId: winnerId,
        })
      }
    }
  }

  return reversals.sort((left, right) => left.delta - right.delta)
}

export function analyzeDecision(state: DecisionState, generatedAt = new Date().toISOString()): DecisionAnalysis {
  const normalizedWeights = normalizeWeights(state)
  const normalizedProbabilities = normalizeProbabilities(state)
  const ranking = rankOptions(state, normalizedWeights, normalizedProbabilities)
  const winnerId = ranking[0]?.optionId ?? null
  const runnerUpId = ranking[1]?.optionId ?? null
  const lead = ranking.length > 1 ? ranking[0].robustScore - ranking[1].robustScore : 0

  return {
    generatedAt,
    ranking,
    winnerId,
    runnerUpId,
    lead: round(lead),
    weakAssumptions: findWeakAssumptions(state),
    rankReversals: findRankReversals(state, winnerId, normalizedWeights, normalizedProbabilities),
    normalizedWeights: Object.fromEntries(
      Object.entries(normalizedWeights).map(([id, value]) => [id, round(value * 100, 2)]),
    ),
    normalizedProbabilities: Object.fromEntries(
      Object.entries(normalizedProbabilities).map(([id, value]) => [id, round(value * 100, 2)]),
    ),
  }
}

export function optionAnalysisById(analysis: DecisionAnalysis, optionId: string): OptionAnalysis | null {
  return analysis.ranking.find((option) => option.optionId === optionId) ?? null
}

export function decisionTemperature(analysis: DecisionAnalysis): 'settled' | 'contested' | 'fragile' {
  if (analysis.rankReversals.length > 0 || analysis.lead < 2) return 'fragile'
  if (analysis.lead < 6 || analysis.weakAssumptions[0]?.risk >= 20) return 'contested'
  return 'settled'
}
