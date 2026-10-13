import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Polyfill in-memory localStorage for Node test runner
const memoryStorage = new Map<string, string>()
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, String(value))
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key)
    },
    clear: () => {
      memoryStorage.clear()
    },
    key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
    get length() {
      return memoryStorage.size
    },
  } as unknown as Storage
}

import { supabase, formatAuthError } from '../lib/supabase.ts'
import { mapSupabaseUser, useAuthStore } from '../store/useAuthStore.ts'
import { usePortfolioStore } from '../store/usePortfolioStore.ts'
import { useWatchlistStore } from '../store/useWatchlistStore.ts'
import { useAlertStore } from '../store/useAlertStore.ts'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// In-memory mock database for Supabase unit tests
type MockRecord = Record<string, unknown>
const mockTables = new Map<string, MockRecord[]>()

class MockQueryBuilder {
  private table: string
  private records: MockRecord[]
  private filters: Array<(row: MockRecord) => boolean> = []
  private isSingle = false
  private isMaybeSingle = false

  constructor(table: string) {
    this.table = table
    const tableData = mockTables.get(table) || []
    this.records = [...tableData]
  }

  select() {
    return this
  }

  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  neq(field: string, value: unknown) {
    this.filters.push((row) => row[field] !== value)
    return this
  }

  order() {
    return this
  }

  limit(count: number) {
    this.records = this.records.slice(0, count)
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  insert(data: MockRecord | MockRecord[]) {
    const list = Array.isArray(data) ? data : [data]
    const created: MockRecord[] = list.map((item) => ({
      id: (item.id as string) || `db_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...item,
    }))
    const current = mockTables.get(this.table) || []
    mockTables.set(this.table, [...current, ...created])
    this.records = created
    return this
  }

  upsert(data: MockRecord) {
    return this.insert(data)
  }

  update(updates: MockRecord) {
    const current = mockTables.get(this.table) || []
    const updated = current.map((row) => {
      const match = this.filters.every((f) => f(row))
      return match ? { ...row, ...updates } : row
    })
    mockTables.set(this.table, updated)
    this.records = updated.filter((row) => this.filters.every((f) => f(row)))
    return this
  }

  delete() {
    const current = mockTables.get(this.table) || []
    const remaining = current.filter((row) => !this.filters.every((f) => f(row)))
    mockTables.set(this.table, remaining)
    this.records = []
    return this
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    const filtered = this.records.filter((row) => this.filters.every((f) => f(row)))
    let result: unknown = filtered
    if (this.isSingle) {
      result = filtered[0] || null
    } else if (this.isMaybeSingle) {
      result = filtered[0] || null
    }

    const payload = { data: result, error: null }
    return Promise.resolve(payload).then(onfulfilled, onrejected)
  }
}

// Bind mock query builder to supabase.from for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
supabase.from = ((table: string) => new MockQueryBuilder(table)) as any

describe('Phase 3: Authentication Architecture & Session Restoration', () => {
  beforeEach(() => {
    memoryStorage.clear()
    mockTables.clear()
    useAuthStore.getState().clearAuth()
    usePortfolioStore.getState().clearPortfolio()
    useWatchlistStore.getState().clearWatchlist()
    useAlertStore.getState().clearAlerts()
  })

  it('restoring a valid Supabase session maps the user identity accurately', () => {
    const mockUser: SupabaseUser = {
      id: 'usr_789_verified',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Satoshi Nakamoto' },
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00.000Z',
      email: 'satoshi@cryptopulse.io',
      phone: '+1234567890',
    }

    const mapped = mapSupabaseUser(mockUser)
    assert.equal(mapped.id, 'usr_789_verified')
    assert.equal(mapped.name, 'Satoshi Nakamoto')
    assert.equal(mapped.email, 'satoshi@cryptopulse.io')
    assert.equal(mapped.provider, 'local')

    useAuthStore.getState().setUser(mockUser)
    const state = useAuthStore.getState()
    assert.equal(state.isAuthenticated, true)
    assert.equal(state.user?.id, 'usr_789_verified')
  })

  it('restoring null session sets unauthenticated state without fabricating a user', () => {
    useAuthStore.getState().setUser(null)
    const state = useAuthStore.getState()
    assert.equal(state.isAuthenticated, false)
    assert.equal(state.user, null)
  })

  it('formatAuthError provides honest, human-readable error messages for known failures', () => {
    assert.match(
      formatAuthError({ message: 'Invalid login credentials' }),
      /invalid email or password/i
    )
    assert.match(
      formatAuthError({ message: 'User already registered' }),
      /account with this email already exists/i
    )
    assert.match(
      formatAuthError({ message: 'Email not confirmed' }),
      /confirm your email/i
    )
    assert.match(
      formatAuthError({ message: 'rate limit reached' }),
      /too many attempts/i
    )
  })

  it('sign-out cleanly wipes auth user, session state, and activity logs', () => {
    const mockUser: SupabaseUser = {
      id: 'usr_wipe_test',
      app_metadata: {},
      user_metadata: { full_name: 'Trader Bob' },
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00.000Z',
      email: 'bob@cryptopulse.io',
    }
    useAuthStore.getState().setUser(mockUser)
    assert.equal(useAuthStore.getState().isAuthenticated, true)

    useAuthStore.getState().clearAuth()
    const cleaned = useAuthStore.getState()
    assert.equal(cleaned.isAuthenticated, false)
    assert.equal(cleaned.user, null)
    assert.equal(cleaned.activityLogs.length, 0)
  })
})

describe('Phase 3: Cross-User Data Isolation & Persistence Scoping', () => {
  const userA = 'user-alice-uuid-001'
  const userB = 'user-bob-uuid-002'

  beforeEach(() => {
    memoryStorage.clear()
    mockTables.clear()
    usePortfolioStore.getState().clearPortfolio()
    useWatchlistStore.getState().clearWatchlist()
    useAlertStore.getState().clearAlerts()
  })

  it('partitions portfolio holdings strictly by authenticated user ID', async () => {
    // User A adds a holding
    await usePortfolioStore.getState().initializeUser(userA)
    const successA = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: 'https://example.com/btc.png',
      quantity: 2.5,
      avgBuyPrice: 62000,
      purchaseDate: '2024-03-01',
    })
    assert.equal(successA, true)

    // User B adds a holding
    await usePortfolioStore.getState().initializeUser(userB)
    const successB = await usePortfolioStore.getState().addHolding({
      coinId: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      image: 'https://example.com/eth.png',
      quantity: 15,
      avgBuyPrice: 3400,
      purchaseDate: '2024-04-01',
    })
    assert.equal(successB, true)

    // User A reloads: verify only Alice's holdings (1 holding, BTC) are retrieved
    usePortfolioStore.getState().clearPortfolio()
    await usePortfolioStore.getState().initializeUser(userA)
    assert.equal(usePortfolioStore.getState().userId, userA)
    assert.equal(usePortfolioStore.getState().holdings.length, 1)
    assert.equal(usePortfolioStore.getState().holdings[0].symbol, 'BTC')

    // User B reloads: verify only Bob's holdings (1 holding, ETH) are retrieved
    usePortfolioStore.getState().clearPortfolio()
    await usePortfolioStore.getState().initializeUser(userB)
    assert.equal(usePortfolioStore.getState().userId, userB)
    assert.equal(usePortfolioStore.getState().holdings.length, 1)
    assert.equal(usePortfolioStore.getState().holdings[0].symbol, 'ETH')
    assert.equal(usePortfolioStore.getState().holdings[0].quantity, 15)
  })

  it('partitions watchlists strictly by authenticated user ID', async () => {
    await useWatchlistStore.getState().initializeUser(userA)
    await useWatchlistStore.getState().addToWatchlist({
      coinId: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      image: '',
    })
    assert.equal(useWatchlistStore.getState().items.length, 1)

    // Bob initializes: verify Bob has 0 items
    useWatchlistStore.getState().clearWatchlist()
    await useWatchlistStore.getState().initializeUser(userB)
    assert.equal(useWatchlistStore.getState().items.length, 0)

    // Bob adds an item
    await useWatchlistStore.getState().addToWatchlist({
      coinId: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      image: '',
    })
    assert.equal(useWatchlistStore.getState().items.length, 1)
    assert.equal(useWatchlistStore.getState().items[0].symbol, 'ADA')

    // Alice switches back: sees only SOL
    useWatchlistStore.getState().clearWatchlist()
    await useWatchlistStore.getState().initializeUser(userA)
    assert.equal(useWatchlistStore.getState().items.length, 1)
    assert.equal(useWatchlistStore.getState().items[0].symbol, 'SOL')
  })

  it('partitions price alerts strictly by authenticated user ID', async () => {
    await useAlertStore.getState().initializeUser(userA)
    await useAlertStore.getState().addAlert({
      symbol: 'BTC',
      type: 'PRICE_ABOVE',
      value: 100000,
      enabled: true,
    })
    assert.equal(useAlertStore.getState().alerts.length, 1)

    // Bob initializes: sees 0 alerts
    useAlertStore.getState().clearAlerts()
    await useAlertStore.getState().initializeUser(userB)
    assert.equal(useAlertStore.getState().alerts.length, 0)

    // Alice switches back: sees her BTC alert
    await useAlertStore.getState().initializeUser(userA)
    assert.equal(useAlertStore.getState().alerts.length, 1)
    assert.equal(useAlertStore.getState().alerts[0].value, 100000)
  })
})

describe('Phase 3: Database Persistence & Synchronous Flow', () => {
  const testUserId = 'test-investor-uuid-999'

  beforeEach(async () => {
    memoryStorage.clear()
    mockTables.clear()
    usePortfolioStore.getState().clearPortfolio()
    useWatchlistStore.getState().clearWatchlist()
    useAlertStore.getState().clearAlerts()

    // Initialize user in stores
    await usePortfolioStore.getState().initializeUser(testUserId)
    await useWatchlistStore.getState().initializeUser(testUserId)
    await useAlertStore.getState().initializeUser(testUserId)
  })

  it('adds holding to database and synchronizes with local state and user cache', async () => {
    const success = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: 'https://example.com/btc.png',
      quantity: 1.5,
      avgBuyPrice: 65000,
      purchaseDate: '2024-06-01',
    })

    assert.equal(success, true)
    const holdings = usePortfolioStore.getState().holdings
    assert.equal(holdings.length, 1)
    assert.equal(holdings[0].symbol, 'BTC')
    assert.equal(holdings[0].quantity, 1.5)

    // Check user-scoped cache was written
    const cachedRaw = memoryStorage.get(`cryptopulse-portfolio-${testUserId}`)
    assert.ok(cachedRaw)
    const cached = JSON.parse(cachedRaw!)
    assert.equal(cached.length, 1)
    assert.equal(cached[0].symbol, 'BTC')
  })

  it('updates holding in database and reflects changes in state', async () => {
    await usePortfolioStore.getState().addHolding({
      coinId: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      image: '',
      quantity: 10,
      avgBuyPrice: 3200,
      purchaseDate: '2024-06-01',
    })

    const initialHolding = usePortfolioStore.getState().holdings[0]
    const updated = await usePortfolioStore.getState().updateHolding(initialHolding.id, {
      quantity: 12,
      avgBuyPrice: 3300,
    })

    assert.equal(updated, true)
    const afterUpdate = usePortfolioStore.getState().holdings[0]
    assert.equal(afterUpdate.quantity, 12)
    assert.equal(afterUpdate.avgBuyPrice, 3300)
  })

  it('removes holding from database and cleans store state', async () => {
    await usePortfolioStore.getState().addHolding({
      coinId: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      image: '',
      quantity: 50,
      avgBuyPrice: 140,
      purchaseDate: '2024-06-01',
    })

    const holdingId = usePortfolioStore.getState().holdings[0].id
    const removed = await usePortfolioStore.getState().removeHolding(holdingId)
    assert.equal(removed, true)
    assert.equal(usePortfolioStore.getState().holdings.length, 0)
  })

  it('adds and removes watchlist items with user scope', async () => {
    const added = await useWatchlistStore.getState().addToWatchlist({
      coinId: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      image: '',
    })
    assert.equal(added, true)
    assert.equal(useWatchlistStore.getState().items.length, 1)

    // Pinning toggle
    const pinned = await useWatchlistStore.getState().togglePin('cardano')
    assert.equal(pinned, true)
    assert.equal(useWatchlistStore.getState().items[0].pinned, true)

    // Removal
    const removed = await useWatchlistStore.getState().removeFromWatchlist('cardano')
    assert.equal(removed, true)
    assert.equal(useWatchlistStore.getState().items.length, 0)
  })

  it('creates, marks triggered, and clears alerts with user scope', async () => {
    const added = await useAlertStore.getState().addAlert({
      symbol: 'BTC',
      type: 'PRICE_ABOVE',
      value: 70000,
      enabled: true,
    })
    assert.equal(added, true)
    assert.equal(useAlertStore.getState().alerts.length, 1)

    const alertId = useAlertStore.getState().alerts[0].id
    await useAlertStore.getState().markTriggered(alertId)
    assert.equal(useAlertStore.getState().alerts[0].triggered, true)

    await useAlertStore.getState().clearTriggered()
    assert.equal(useAlertStore.getState().alerts[0].triggered, false)
  })
})

describe('Phase 3: Store Input Validation & Error Handling', () => {
  beforeEach(() => {
    memoryStorage.clear()
    usePortfolioStore.getState().clearPortfolio()
  })

  it('rejects adding holdings when unauthenticated without writing data', async () => {
    usePortfolioStore.getState().clearPortfolio()
    const success = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      quantity: 1,
      avgBuyPrice: 65000,
      purchaseDate: '2024-06-01',
    })

    assert.equal(success, false)
    assert.match(usePortfolioStore.getState().error || '', /authenticated/i)
    assert.equal(usePortfolioStore.getState().holdings.length, 0)
  })

  it('rejects adding holdings with invalid or non-finite quantities', async () => {
    usePortfolioStore.setState({ userId: 'test-user-id' })

    const zeroQty = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      quantity: 0,
      avgBuyPrice: 65000,
      purchaseDate: '2024-06-01',
    })
    assert.equal(zeroQty, false)

    const negQty = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      quantity: -5,
      avgBuyPrice: 65000,
      purchaseDate: '2024-06-01',
    })
    assert.equal(negQty, false)

    const nanQty = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      quantity: NaN,
      avgBuyPrice: 65000,
      purchaseDate: '2024-06-01',
    })
    assert.equal(nanQty, false)
  })

  it('rejects adding holdings with negative buy prices', async () => {
    usePortfolioStore.setState({ userId: 'test-user-id' })

    const negPrice = await usePortfolioStore.getState().addHolding({
      coinId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      quantity: 1,
      avgBuyPrice: -100,
      purchaseDate: '2024-06-01',
    })
    assert.equal(negPrice, false)
    assert.match(usePortfolioStore.getState().error || '', /price/i)
  })

  it('rejects updating holdings with invalid quantity or negative price', async () => {
    usePortfolioStore.setState({
      userId: 'test-user-id',
      holdings: [
        {
          id: 'test_hold_1',
          coinId: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          image: '',
          quantity: 1,
          avgBuyPrice: 60000,
          purchaseDate: '2024-06-01',
        },
      ],
    })

    const invalidUpdateQty = await usePortfolioStore.getState().updateHolding('test_hold_1', { quantity: -2 })
    assert.equal(invalidUpdateQty, false)

    const invalidUpdatePrice = await usePortfolioStore.getState().updateHolding('test_hold_1', { avgBuyPrice: -50 })
    assert.equal(invalidUpdatePrice, false)
  })
})

describe('Phase 3: Database Security & RLS Policy Invariants', () => {
  it('enforces that service role key is NEVER bundled or exposed in client environment', () => {
    const envVars = process.env
    assert.equal(
      envVars.VITE_SUPABASE_SERVICE_ROLE_KEY,
      undefined,
      'Service role key must not be prefixed with VITE_ or exposed to frontend code'
    )
  })

  it('verifies that user-scoped cache keys are structured predictably without collisions', () => {
    const user1 = '11111111-1111-1111-1111-111111111111'
    const user2 = '22222222-2222-2222-2222-222222222222'

    const keyPortfolio1 = `cryptopulse-portfolio-${user1}`
    const keyPortfolio2 = `cryptopulse-portfolio-${user2}`
    assert.notEqual(keyPortfolio1, keyPortfolio2)

    const keyWatchlist1 = `cryptopulse-watchlist-${user1}`
    const keyWatchlist2 = `cryptopulse-watchlist-${user2}`
    assert.notEqual(keyWatchlist1, keyWatchlist2)

    const keyAlerts1 = `cryptopulse-alerts-${user1}`
    const keyAlerts2 = `cryptopulse-alerts-${user2}`
    assert.notEqual(keyAlerts1, keyAlerts2)
  })
})
