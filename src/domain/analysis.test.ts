import { describe, expect, it } from 'vitest'
import {
  analyzeDecision,
  decisionTemperature,
  normalizeProbabilities,
  normalizeWeights,
  optionAnalysisById,
} from './analysis'
import { createDemoDecision } from './demo'

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + value, 0)
}

describe('decision analysis', () => {
  it('normalizes criteria and futures without mutating the source model', () => {
    const state = createDemoDecision()
    state.criteria[0].weight = 91
    state.scenarios[0].probability = 3
    const before = structuredClone(state)

    const weights = normalizeWeights(state)
    const probabilities = normalizeProbabilities(state)

    expect(sum(weights)).toBeCloseTo(1, 10)
    expect(sum(probabilities)).toBeCloseTo(1, 10)
    expect(weights.lives).toBeGreaterThan(weights.learning)
    expect(state).toEqual(before)
  })

  it('returns a complete deterministic ranking for a fixed generation time', () => {
    const state = createDemoDecision()
    const timestamp = '2026-09-03T13:30:00.000Z'

    const first = analyzeDecision(state, timestamp)
    const second = analyzeDecision(state, timestamp)

    expect(first).toEqual(second)
    expect(first.ranking).toHaveLength(state.options.length)
    expect(first.ranking.map((option) => option.rank)).toEqual([1, 2, 3, 4])
    expect(new Set(first.ranking.map((option) => option.optionId)).size).toBe(state.options.length)
    expect(first.winnerId).toBe(first.ranking[0].optionId)
    expect(first.runnerUpId).toBe(first.ranking[1].optionId)
    expect(first.lead).toBeCloseTo(first.ranking[0].robustScore - first.ranking[1].robustScore, 1)
  })

  it('keeps reported scores and confidence values inside declared bounds', () => {
    const analysis = analyzeDecision(createDemoDecision())

    for (const option of analysis.ranking) {
      expect(option.baseScore).toBeGreaterThanOrEqual(0)
      expect(option.baseScore).toBeLessThanOrEqual(100)
      expect(option.robustScore).toBeGreaterThanOrEqual(0)
      expect(option.robustScore).toBeLessThanOrEqual(100)
      expect(option.worstCaseScore).toBeGreaterThanOrEqual(0)
      expect(option.worstCaseScore).toBeLessThanOrEqual(100)
      expect(option.confidence).toBeGreaterThanOrEqual(10)
      expect(option.confidence).toBeLessThanOrEqual(99)
      expect(option.regret).toBeGreaterThanOrEqual(0)
      expect(option.scenarioScores).toHaveLength(3)
    }
  })

  it('never rewards additional caution when uncertainty penalties are positive', () => {
    const exploratory = createDemoDecision()
    exploratory.riskAversion = 0
    const protective = createDemoDecision()
    protective.riskAversion = 1

    const lowCaution = analyzeDecision(exploratory)
    const highCaution = analyzeDecision(protective)

    for (const low of lowCaution.ranking) {
      const high = optionAnalysisById(highCaution, low.optionId)
      expect(high).not.toBeNull()
      expect(high!.robustScore).toBeLessThanOrEqual(low.robustScore)
    }
  })

  it('inverts cost criteria before aggregation', () => {
    const state = createDemoDecision()
    state.criteria = [
      {
        id: 'cost',
        name: 'Cost',
        description: 'Lower is better.',
        weight: 100,
        direction: 'cost',
      },
    ]
    state.scenarios = []
    state.assumptions = []
    state.riskAversion = 0
    state.options = [
      {
        ...state.options[0],
        id: 'cheap',
        name: 'Cheap',
        scores: { cost: 10 },
        scenarioImpacts: {},
        assumptionExposure: {},
      },
      {
        ...state.options[1],
        id: 'expensive',
        name: 'Expensive',
        scores: { cost: 90 },
        scenarioImpacts: {},
        assumptionExposure: {},
      },
    ]

    const analysis = analyzeDecision(state)

    expect(analysis.winnerId).toBe('cheap')
    expect(optionAnalysisById(analysis, 'cheap')?.baseScore).toBe(90)
    expect(optionAnalysisById(analysis, 'expensive')?.baseScore).toBe(10)
  })

  it('surfaces fragility from uncertainty, impact, and exposure', () => {
    const state = createDemoDecision()
    const analysis = analyzeDecision(state)
    const first = analysis.weakAssumptions[0]

    expect(first.risk).toBeGreaterThanOrEqual(analysis.weakAssumptions.at(-1)?.risk ?? 0)
    expect(first.affectedOptions.length).toBeGreaterThan(0)
    expect(state.assumptions.some((assumption) => assumption.id === first.assumptionId)).toBe(true)
    expect(['settled', 'contested', 'fragile']).toContain(decisionTemperature(analysis))
  })
})
