import type { CSSProperties } from 'react'
import { round } from '../domain/analysis'
import type { DecisionAnalysis, DecisionState, OptionAnalysis } from '../domain/types'
import { Icon } from './Icon'

interface DecisionViewProps {
  state: DecisionState
  analysis: DecisionAnalysis
  onSelectOption: (optionId: string) => void
  onSetCriterionWeight: (criterionId: string, value: number) => void
  onSetOptionScore: (optionId: string, criterionId: string, value: number) => void
  onSetScenarioProbability: (scenarioId: string, value: number) => void
}

function optionName(state: DecisionState, optionId: string | null): string {
  if (!optionId) return 'No leader yet'
  return state.options.find((option) => option.id === optionId)?.name ?? optionId
}

function optionResult(analysis: DecisionAnalysis, optionId: string): OptionAnalysis | undefined {
  return analysis.ranking.find((candidate) => candidate.optionId === optionId)
}

function accentClass(index: number): string {
  return `accent-${index % 6}`
}

function scoreTone(score: number): string {
  if (score >= 80) return 'score-high'
  if (score >= 65) return 'score-medium'
  return 'score-low'
}

function SvgOptionNode({
  index,
  name,
  thesis,
  result,
  x,
  y,
  selected,
}: {
  index: number
  name: string
  thesis: string
  result: OptionAnalysis
  x: number
  y: number
  selected: boolean
}) {
  const width = 222
  const height = 94
  return (
    <g className={`map-option-node ${accentClass(index)} ${selected ? 'is-selected' : ''}`}>
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx="18" className="map-option-bg" />
      <circle cx={x - width / 2 + 33} cy={y - 8} r="21" className="map-score-orb" />
      <text x={x - width / 2 + 33} y={y - 3} textAnchor="middle" className="map-score-text">
        {Math.round(result.robustScore)}
      </text>
      <text x={x - width / 2 + 66} y={y - 14} className="map-option-title">
        {name.length > 22 ? `${name.slice(0, 21)}…` : name}
      </text>
      <text x={x - width / 2 + 66} y={y + 8} className="map-option-thesis">
        {thesis.length > 31 ? `${thesis.slice(0, 30)}…` : thesis}
      </text>
      <text x={x - width / 2 + 66} y={y + 30} className="map-option-rank">
        RANK {result.rank} · WORST {Math.round(result.worstCaseScore)}
      </text>
    </g>
  )
}

export function DecisionMapView({ state, analysis, onSelectOption }: DecisionViewProps) {
  const winner = analysis.ranking[0]
  const selectedId = state.selectedOptionId ?? winner?.optionId ?? null
  const weak = analysis.weakAssumptions[0]
  const selected = selectedId ? optionResult(analysis, selectedId) : undefined
  const positions = [
    { x: 190, y: 150 },
    { x: 810, y: 150 },
    { x: 190, y: 470 },
    { x: 810, y: 470 },
    { x: 500, y: 82 },
    { x: 500, y: 538 },
  ]

  return (
    <section className="workspace-view map-view" aria-labelledby="map-heading">
      <div className="insight-ribbon">
        <div>
          <span className="eyebrow">Decision signal</span>
          <h2 id="map-heading">
            {optionName(state, analysis.winnerId)} leads by <strong>{analysis.lead.toFixed(1)} pts</strong>
          </h2>
          <p>
            The lead is conditional on {state.assumptions.length} explicit assumptions and the current value weights—not a forecast of fact.
          </p>
        </div>
        <div className="signal-cluster" aria-label="Decision diagnostics">
          <div className="signal-stat">
            <span>Temperature</span>
            <strong>{analysis.rankReversals.length > 0 || analysis.lead < 2 ? 'Fragile' : analysis.lead < 6 ? 'Contested' : 'Stable'}</strong>
          </div>
          <div className="signal-stat">
            <span>Rank flips</span>
            <strong>{analysis.rankReversals.length}</strong>
          </div>
          <div className="signal-stat">
            <span>Human caution</span>
            <strong>{Math.round(state.riskAversion * 100)}%</strong>
          </div>
        </div>
      </div>

      <div className="decision-map-shell">
        <div className="map-toolbar">
          <div className="map-legend">
            <span><i className="legend-dot robust" /> robust score</span>
            <span><i className="legend-line" /> shared question</span>
            <span><i className="legend-dot uncertain" /> fragile input</span>
          </div>
          <span className="map-revision">MODEL r{state.revision}</span>
        </div>

        <svg className="decision-map" viewBox="0 0 1000 620" role="img" aria-labelledby="decision-map-title decision-map-description">
          <title id="decision-map-title">ForkRoom decision constellation</title>
          <desc id="decision-map-description">
            The central question connects to each option. Node scores are robust scores after scenario and uncertainty adjustments.
          </desc>
          <defs>
            <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="map-grid-dot" />
            </pattern>
          </defs>
          <rect width="1000" height="620" fill="url(#dot-grid)" />
          <circle cx="500" cy="310" r="130" className="map-orbit orbit-one" />
          <circle cx="500" cy="310" r="220" className="map-orbit orbit-two" />

          {state.options.slice(0, 6).map((option, index) => {
            const result = optionResult(analysis, option.id)
            const position = positions[index]
            if (!result || !position) return null
            return (
              <g key={`connection-${option.id}`}>
                <line
                  x1="500"
                  y1="310"
                  x2={position.x}
                  y2={position.y}
                  className={`map-connection ${result.rank === 1 ? 'is-leading' : ''}`}
                />
                <circle cx={(500 + position.x) / 2} cy={(310 + position.y) / 2} r="4" className="map-junction" />
              </g>
            )
          })}

          <g className="question-core">
            <circle cx="500" cy="310" r="102" />
            <foreignObject x="410" y="235" width="180" height="150">
              <div className="question-core-copy">
                <span>SHARED QUESTION</span>
                <strong>{state.question}</strong>
                <small>{state.budget}</small>
              </div>
            </foreignObject>
          </g>

          {state.options.slice(0, 6).map((option, index) => {
            const result = optionResult(analysis, option.id)
            const position = positions[index]
            if (!result || !position) return null
            return (
              <SvgOptionNode
                key={option.id}
                index={index}
                name={option.name}
                thesis={option.thesis}
                result={result}
                x={position.x}
                y={position.y}
                selected={option.id === selectedId}
              />
            )
          })}

          {weak ? (
            <g className="fragile-beacon">
              <circle cx="500" cy="574" r="12" />
              <path d="M500 562V538" />
              <text x="520" y="579">FRAGILE INPUT · {Math.round(weak.risk)}</text>
            </g>
          ) : null}
        </svg>
      </div>

      <div className="map-lower-grid">
        <div className="option-deck" aria-label="Options ranked by robust score">
          {analysis.ranking.map((result) => {
            const optionIndex = state.options.findIndex((option) => option.id === result.optionId)
            const option = state.options[optionIndex]
            if (!option) return null
            return (
              <button
                key={option.id}
                className={`option-ticket ${accentClass(optionIndex)} ${option.id === selectedId ? 'is-selected' : ''}`}
                onClick={() => onSelectOption(option.id)}
                aria-pressed={option.id === selectedId}
              >
                <span className="ticket-rank">0{result.rank}</span>
                <span className="ticket-copy">
                  <strong>{option.name}</strong>
                  <small>{option.thesis}</small>
                </span>
                <span className={`ticket-score ${scoreTone(result.robustScore)}`}>{result.robustScore.toFixed(1)}</span>
              </button>
            )
          })}
        </div>

        <aside className="selection-inspector" aria-label="Selected option diagnostics">
          {selectedId && selected ? (
            <>
              <div className="inspector-heading">
                <span className="eyebrow">Selected path</span>
                <strong>{optionName(state, selectedId)}</strong>
              </div>
              <div className="score-stack">
                <div>
                  <span>Base value</span>
                  <strong>{selected.baseScore.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Future lift</span>
                  <strong>{selected.scenarioAdjustment >= 0 ? '+' : ''}{selected.scenarioAdjustment.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Uncertainty tax</span>
                  <strong>−{selected.assumptionPenalty.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Worst case</span>
                  <strong>{selected.worstCaseScore.toFixed(1)}</strong>
                </div>
              </div>
              <div className="confidence-meter">
                <div><span>Model confidence</span><strong>{Math.round(selected.confidence)}%</strong></div>
                <div className="meter-track"><i style={{ width: `${selected.confidence}%` }} /></div>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {weak ? (
        <div className="fragility-callout">
          <div className="callout-icon"><Icon name="alert" /></div>
          <div>
            <span className="eyebrow">Highest leverage uncertainty</span>
            <strong>{optionName(state, weak.affectedOptions[0] ?? null)} depends on an assumption with {weak.confidence}% confidence.</strong>
            <p>{state.assumptions.find((assumption) => assumption.id === weak.assumptionId)?.statement}</p>
          </div>
          <div className="risk-chip">risk {weak.risk.toFixed(1)}</div>
        </div>
      ) : null}
    </section>
  )
}

export function MatrixView({
  state,
  analysis,
  onSelectOption,
  onSetCriterionWeight,
  onSetOptionScore,
}: DecisionViewProps) {
  const weightTotal = state.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  return (
    <section className="workspace-view matrix-view" aria-labelledby="matrix-heading">
      <div className="view-heading-row">
        <div>
          <span className="eyebrow">Values become visible</span>
          <h2 id="matrix-heading">Decision matrix</h2>
          <p>Move a weight or score. ForkRoom immediately recomputes robustness, regret, and rank reversals.</p>
        </div>
        <div className="total-badge"><span>Normalized</span><strong>{Math.round(weightTotal)}%</strong></div>
      </div>

      <div className="weight-grid">
        {state.criteria.map((criterion, index) => (
          <label className={`weight-card ${accentClass(index)}`} key={criterion.id}>
            <span className="weight-card-top">
              <span><i />{criterion.name}</span>
              <strong>{Math.round(criterion.weight)}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={round(criterion.weight)}
              onChange={(event) => onSetCriterionWeight(criterion.id, Number(event.currentTarget.value))}
              aria-label={`Weight for ${criterion.name}`}
            />
            <small>{criterion.description}</small>
          </label>
        ))}
      </div>

      <div className="matrix-table-shell">
        <table className="decision-matrix">
          <caption>Option scores from 0 to 100. Higher is better after direction normalization.</caption>
          <thead>
            <tr>
              <th scope="col">Option</th>
              {state.criteria.map((criterion) => (
                <th scope="col" key={criterion.id}>
                  <span>{criterion.name}</span>
                  <small>{Math.round(criterion.weight)}% weight</small>
                </th>
              ))}
              <th scope="col">Robust</th>
            </tr>
          </thead>
          <tbody>
            {state.options.map((option, optionIndex) => {
              const result = optionResult(analysis, option.id)
              return (
                <tr key={option.id} className={option.id === state.selectedOptionId ? 'is-selected' : ''}>
                  <th scope="row">
                    <button onClick={() => onSelectOption(option.id)} className="matrix-option-button">
                      <i className={accentClass(optionIndex)} />
                      <span><strong>{option.name}</strong><small>{option.thesis}</small></span>
                    </button>
                  </th>
                  {state.criteria.map((criterion) => {
                    const value = option.scores[criterion.id] ?? 50
                    return (
                      <td key={criterion.id}>
                        <label className={`score-cell ${scoreTone(value)}`}>
                          <span className="sr-only">{option.name} score for {criterion.name}</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={round(value)}
                            onChange={(event) => onSetOptionScore(option.id, criterion.id, Number(event.currentTarget.value))}
                            style={{ '--cell-score': `${value}%` } as CSSProperties}
                          />
                        </label>
                      </td>
                    )
                  })}
                  <td>
                    <div className={`matrix-result ${accentClass(optionIndex)}`}>
                      <strong>{result?.robustScore.toFixed(1) ?? '—'}</strong>
                      <small>#{result?.rank ?? '—'}</small>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="method-note">
        <Icon name="info" />
        <p>
          <strong>Method boundary.</strong> Scores are structured judgments, not measured causal effects. Robust score combines weighted value, probability-weighted future impact, and a caution-scaled uncertainty penalty. Change inputs when evidence changes.
        </p>
      </div>
    </section>
  )
}

function chartPoint(index: number, score: number, count: number): { x: number; y: number } {
  const x = count <= 1 ? 500 : 90 + (index * 820) / (count - 1)
  const y = 350 - (score / 100) * 270
  return { x, y }
}

function optionPath(scores: number[]): string {
  return scores
    .map((score, index) => {
      const point = chartPoint(index, score, scores.length)
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    })
    .join(' ')
}

export function FuturesView({ state, analysis, onSetScenarioProbability, onSelectOption }: DecisionViewProps) {
  return (
    <section className="workspace-view futures-view" aria-labelledby="futures-heading">
      <div className="view-heading-row">
        <div>
          <span className="eyebrow">Branch before reality does</span>
          <h2 id="futures-heading">Possible futures</h2>
          <p>Reweight futures to see which option survives—not merely which option wins on average.</p>
        </div>
        <div className="total-badge"><span>Futures</span><strong>{state.scenarios.length}</strong></div>
      </div>

      <div className="future-control-grid">
        {state.scenarios.map((scenario, index) => (
          <label className={`future-card severity-${scenario.severity} ${accentClass(index)}`} key={scenario.id}>
            <span className="future-card-top">
              <span className="future-number">0{index + 1}</span>
              <span className="severity-chip">{scenario.severity}</span>
            </span>
            <strong>{scenario.name}</strong>
            <p>{scenario.description}</p>
            <div className="probability-control">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={round(scenario.probability)}
                onChange={(event) => onSetScenarioProbability(scenario.id, Number(event.currentTarget.value))}
                aria-label={`Probability of ${scenario.name}`}
              />
              <span>{Math.round(scenario.probability)}%</span>
            </div>
          </label>
        ))}
      </div>

      <div className="future-chart-card">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">Option survival curves</span>
            <strong>Score by future</strong>
          </div>
          <div className="chart-legend">
            {state.options.map((option, index) => (
              <button key={option.id} onClick={() => onSelectOption(option.id)} className={accentClass(index)}>
                <i />{option.name}
              </button>
            ))}
          </div>
        </div>
        <svg className="future-chart" viewBox="0 0 1000 420" role="img" aria-labelledby="future-chart-title future-chart-desc">
          <title id="future-chart-title">Option scores across possible futures</title>
          <desc id="future-chart-desc">Each line shows the base option score and its score in every defined future.</desc>
          {[0, 25, 50, 75, 100].map((score) => {
            const y = chartPoint(0, score, state.scenarios.length + 1).y
            return (
              <g key={score}>
                <line x1="70" y1={y} x2="930" y2={y} className="chart-grid-line" />
                <text x="45" y={y + 4} className="chart-axis-label">{score}</text>
              </g>
            )
          })}
          {['Now', ...state.scenarios.map((scenario) => scenario.name)].map((label, index, labels) => {
            const point = chartPoint(index, 0, labels.length)
            return <text key={label} x={point.x} y="388" textAnchor="middle" className="chart-x-label">{label.length > 19 ? `${label.slice(0, 18)}…` : label}</text>
          })}
          {state.options.map((option, optionIndex) => {
            const result = optionResult(analysis, option.id)
            const scores = [
              result?.baseScore ?? 50,
              ...state.scenarios.map((scenario) => result?.scenarioScores.find((score) => score.scenarioId === scenario.id)?.score ?? 50),
            ]
            return (
              <g key={option.id} className={`future-line ${accentClass(optionIndex)} ${option.id === state.selectedOptionId ? 'is-selected' : ''}`}>
                <path d={optionPath(scores)} />
                {scores.map((score, index) => {
                  const point = chartPoint(index, score, scores.length)
                  return <circle key={`${option.id}-${index}`} cx={point.x} cy={point.y} r={option.id === state.selectedOptionId ? 6 : 4} />
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="futures-lower-grid">
        <div className="robust-ranking-panel">
          <div className="panel-title-row"><span className="eyebrow">Robust leaderboard</span><small>higher survives more</small></div>
          {analysis.ranking.map((result) => {
            const index = state.options.findIndex((option) => option.id === result.optionId)
            return (
              <button key={result.optionId} className="robust-row" onClick={() => onSelectOption(result.optionId)}>
                <span className={`robust-rank ${accentClass(index)}`}>0{result.rank}</span>
                <span className="robust-name">{optionName(state, result.optionId)}</span>
                <span className="robust-bar"><i className={accentClass(index)} style={{ width: `${result.robustScore}%` }} /></span>
                <strong>{result.robustScore.toFixed(1)}</strong>
                <small>worst {result.worstCaseScore.toFixed(0)}</small>
              </button>
            )
          })}
        </div>

        <div className="reversal-panel">
          <div className="panel-title-row"><span className="eyebrow">Value fault lines</span><small>{analysis.rankReversals.length} detected</small></div>
          {analysis.rankReversals.length > 0 ? analysis.rankReversals.slice(0, 4).map((reversal) => (
            <div className="reversal-card" key={`${reversal.criterionId}-${reversal.direction}`}>
              <Icon name="fork" />
              <div>
                <strong>{reversal.criterionName} {reversal.direction === 'increase' ? '↑' : '↓'} {reversal.delta.toFixed(1)} pts</strong>
                <span>{optionName(state, reversal.fromWinnerId)} → {optionName(state, reversal.toWinnerId)}</span>
              </div>
            </div>
          )) : (
            <div className="empty-diagnostic">
              <Icon name="shield" />
              <strong>No rank reversal in the standard perturbation.</strong>
              <p>The current leader survived ±15 raw weight-point tests. That is sensitivity evidence, not certainty.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
