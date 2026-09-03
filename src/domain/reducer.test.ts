import { describe, expect, it } from 'vitest'
import { createDemoDecision } from './demo'
import { createProposal, isDecisionState, reduceDecision } from './reducer'

function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}

describe('decision reducer and human approval boundary', () => {
  it('stages an agent proposal without changing the decision model', () => {
    const state = createDemoDecision()
    const proposal = createProposal({
      kind: 'option',
      title: 'Add option · Shade Corridors',
      rationale: 'This tests a distributed public-space intervention distinct from the existing portfolios.',
      payload: {
        name: 'Shade Corridors',
        description: 'Deploy trees, canopies, and reflective surfaces on priority walking routes.',
        thesis: 'Protect people during unavoidable outdoor travel.',
      },
    }, '2026-09-03T14:00:00.000Z')

    const staged = reduceDecision(state, { type: 'add-proposal', proposal })

    expect(staged.options).toHaveLength(state.options.length)
    expect(staged.proposals).toHaveLength(1)
    expect(staged.proposals[0].status).toBe('pending')
    expect(staged.activity[0].actor).toBe('agent')
  })

  it('admits a proposal only after explicit human approval', () => {
    const initial = createDemoDecision()
    const proposal = createProposal({
      kind: 'option',
      title: 'Add option · Shade Corridors',
      rationale: 'This tests a distributed public-space intervention distinct from the existing portfolios.',
      payload: {
        name: 'Shade Corridors',
        description: 'Deploy trees, canopies, and reflective surfaces on priority walking routes.',
        thesis: 'Protect people during unavoidable outdoor travel.',
        scores: { lives: 72, equity: 83, speed: 58, resilience: 38, learning: 64 },
      },
    })
    const staged = reduceDecision(initial, { type: 'add-proposal', proposal })

    const approved = reduceDecision(staged, {
      type: 'review-proposal',
      proposalId: proposal.id,
      status: 'approved',
    })

    expect(approved.options).toHaveLength(initial.options.length + 1)
    expect(approved.options.at(-1)?.name).toBe('Shade Corridors')
    expect(approved.proposals[0].status).toBe('approved')
    expect(approved.activity[0].actor).toBe('human')
    expect(approved.activity[0].kind).toBe('proposal-approved')
  })

  it('rejects a proposal without applying its payload', () => {
    const initial = createDemoDecision()
    const proposal = createProposal({
      kind: 'criterion',
      title: 'Add value · Visibility',
      rationale: 'Public visibility can influence legitimacy but should remain a human decision value.',
      payload: {
        name: 'Visibility',
        description: 'How visibly residents encounter the intervention.',
        weight: 10,
        direction: 'benefit',
        unit: 'relative score',
        default_score: 50,
      },
    })
    const staged = reduceDecision(initial, { type: 'add-proposal', proposal })

    const rejected = reduceDecision(staged, {
      type: 'review-proposal',
      proposalId: proposal.id,
      status: 'rejected',
    })

    expect(rejected.criteria).toHaveLength(initial.criteria.length)
    expect(rejected.proposals[0].status).toBe('rejected')
    expect(rejected.activity[0].kind).toBe('proposal-rejected')
  })

  it('renormalizes criterion weights to 100 after a human edit', () => {
    const initial = createDemoDecision()

    const changed = reduceDecision(initial, {
      type: 'set-criterion-weight',
      criterionId: 'equity',
      value: 40,
    })

    expect(total(changed.criteria.map((criterion) => criterion.weight))).toBeCloseTo(100, 10)
    expect(changed.criteria.find((criterion) => criterion.id === 'equity')?.weight).toBe(40)
    expect(changed.activity[0].actor).toBe('human')
  })

  it('renormalizes future probabilities to 100 after a human edit', () => {
    const initial = createDemoDecision()

    const changed = reduceDecision(initial, {
      type: 'set-scenario-probability',
      scenarioId: 'outage',
      value: 60,
    })

    expect(total(changed.scenarios.map((scenario) => scenario.probability))).toBeCloseTo(100, 10)
    expect(changed.scenarios.find((scenario) => scenario.id === 'outage')?.probability).toBe(60)
  })

  it('clamps direct human scores to the declared scale', () => {
    const initial = createDemoDecision()

    const changed = reduceDecision(initial, {
      type: 'set-option-score',
      optionId: 'cooling-commons',
      criterionId: 'lives',
      value: 140,
    })

    expect(changed.options.find((option) => option.id === 'cooling-commons')?.scores.lives).toBe(100)
  })

  it('applies a challenged assumption only on approval', () => {
    const initial = createDemoDecision()
    const proposal = createProposal({
      kind: 'assumption-challenge',
      title: 'Challenge matching funds',
      rationale: 'Funding timing is uncertain and highly consequential for the infrastructure path.',
      payload: {
        assumption_id: 'matching',
        counterpoint: 'Comparable awards slipped beyond the construction invoice date.',
        revised_confidence: 25,
        test: 'Require a written disbursement milestone.',
      },
    })
    const staged = reduceDecision(initial, { type: 'add-proposal', proposal })
    expect(staged.assumptions.find((assumption) => assumption.id === 'matching')?.challenged).toBe(false)

    const approved = reduceDecision(staged, {
      type: 'review-proposal',
      proposalId: proposal.id,
      status: 'approved',
    })
    const assumption = approved.assumptions.find((candidate) => candidate.id === 'matching')
    expect(assumption?.challenged).toBe(true)
    expect(assumption?.confidence).toBe(25)
    expect(assumption?.counterpoint).toContain('awards slipped')
  })

  it('performs a conservative structural check on imported state', () => {
    expect(isDecisionState(createDemoDecision())).toBe(true)
    expect(isDecisionState({ schemaVersion: 1, id: 'x' })).toBe(false)
    expect(isDecisionState(null)).toBe(false)
    expect(isDecisionState([])).toBe(false)
  })
})
