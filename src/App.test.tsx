import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

beforeEach(() => {
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: undefined,
  })
  Object.defineProperty(navigator, 'modelContext', {
    configurable: true,
    value: undefined,
  })
})

function workspaceNavigation() {
  return within(screen.getByRole('navigation', { name: 'Decision workspace views' }))
}

describe('ForkRoom product experience', () => {
  it('renders the complete seeded decision workspace', async () => {
    render(<App />)

    expect(screen.getByText('ForkRoom')).toBeInTheDocument()
    expect(screen.getAllByText(/How should Harbor City spend/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('button', { name: /Cooling Commons/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('main')).toBeInTheDocument()

    await waitFor(() => {
      expect(window.__FORKROOM_DEVTOOLS__?.listTools()).toHaveLength(16)
    })
  })

  it('moves between map, matrix, futures, and audit views through the human UI', () => {
    render(<App />)
    const navigation = workspaceNavigation()

    fireEvent.click(navigation.getByRole('button', { name: /^Matrix/ }))
    expect(screen.getByRole('heading', { name: 'Decision matrix' })).toBeInTheDocument()

    fireEvent.click(navigation.getByRole('button', { name: /^Futures/ }))
    expect(screen.getByRole('heading', { name: 'Possible futures' })).toBeInTheDocument()

    fireEvent.click(navigation.getByRole('button', { name: /^Audit/ }))
    expect(screen.getByRole('heading', { name: 'Decision ledger' })).toBeInTheDocument()

    fireEvent.click(navigation.getByRole('button', { name: /^Map/ }))
    expect(screen.getByRole('heading', { name: /leads by/i })).toBeInTheDocument()
  })

  it('shows the protocol design and all tool categories in the visible interface', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /16 tools ready/i }))

    expect(screen.getByRole('dialog', { name: 'The page is the shared tool server' })).toBeInTheDocument()
    expect(screen.getByText('Observe & falsify')).toBeInTheDocument()
    expect(screen.getByText('Stage, never smuggle')).toBeInTheDocument()
    expect(screen.getByText('Share attention')).toBeInTheDocument()
    expect(screen.getByText('forkroom_inspect_decision')).toBeInTheDocument()
    expect(screen.getByText('forkroom_draft_commitment')).toBeInTheDocument()
  })

  it('persists a human value change in browser-local state', async () => {
    render(<App />)
    fireEvent.click(workspaceNavigation().getByRole('button', { name: /^Matrix/ }))

    const equityWeight = screen.getByRole('slider', { name: 'Weight for Equity' })
    fireEvent.change(equityWeight, { target: { value: '40' } })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('forkroom:webmcp:decision:v1') ?? '{}')
      expect(stored.criteria.find((criterion: { id: string }) => criterion.id === 'equity').weight).toBe(40)
      expect(stored.revision).toBeGreaterThan(1)
    })
  })

  it('runs the judge demo through real tool handlers and preserves the approval boundary', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Judge demo' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Decision ledger' })).toBeInTheDocument()
    }, { timeout: 3_000 })

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('forkroom:webmcp:decision:v1') ?? '{}')
      const proposal = stored.proposals.find(
        (candidate: { kind: string; payload: { assumption_id?: string } }) =>
          candidate.kind === 'assumption-challenge' && candidate.payload.assumption_id === 'matching',
      )
      const assumption = stored.assumptions.find((candidate: { id: string }) => candidate.id === 'matching')
      expect(proposal?.status).toBe('pending')
      expect(assumption?.challenged).toBe(false)
    }, { timeout: 3_000 })

    expect(screen.getByText('challenge_assumption')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Approve/i }).length).toBeGreaterThan(0)
  })
})
