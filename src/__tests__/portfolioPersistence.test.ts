import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// In-memory localStorage polyfill for Node test runner
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

import { supabase } from '../lib/supabase.ts'
import { usePortfolioStore } from '../store/usePortfolioStore.ts'
import {
  mapDbHoldingToModel,
  fetchUserHoldings,
  type DbHoldingRow,
} from '../services/portfolioService.ts'

// In-memory mock database for Supabase portfolio unit tests
type MockRecord = Record<string, unknown>
const mockTables = new Map<string, MockRecord[]>()
let mockTableError: { table: string; error: { message: string; code?: string } } | null = null

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

  order() {
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
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    if (mockTableError && mockTableError.table === this.table) {
      const errorPayload = { data: null, error: mockTableError.error }
      return Promise.resolve(errorPayload).then(onfulfilled, onrejected)
    }

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

// Attach mock query builder to supabase.from
// eslint-disable-next-line @typescript-eslint/no-explicit-any
supabase.from = ((table: string) => new MockQueryBuilder(table)) as any

describe('Portfolio Persistence & Database Error Handling Regression Suite', () => {
  const testUserId = 'usr_alice_123'
  const otherUserId = 'usr_bob_456'

  beforeEach(() => {
    memoryStorage.clear()
    mockTables.clear()
    mockTableError = null
    usePortfolioStore.getState().clearPortfolio()
  })

  it('1. A successful empty holdings response displays an empty portfolio', async () => {
    // Database returns empty array [] with no error
    mockTables.set('holdings', [])

    await usePortfolioStore.getState().initializeUser(testUserId)

    const state = usePortfolioStore.getState()
    assert.equal(state.userId, testUserId)
    assert.deepEqual(state.holdings, [])
    assert.equal(state.isLoading, false)
    assert.equal(state.error, null)
  })

  it('2. A missing-table error displays an actionable error and sets error in state', async () => {
    // Simulate PostgREST schema cache missing table error (PGRST205)
    mockTableError = {
      table: 'holdings',
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.holdings' in the schema cache",
      },
    }

    await usePortfolioStore.getState().initializeUser(testUserId)

    const state = usePortfolioStore.getState()
    assert.equal(state.isLoading, false)
    assert.ok(state.error !== null)
    assert.ok(state.error.includes("Could not find the table 'public.holdings' in the schema cache"))
    // Ensure the failed request is NOT treated as a successfully empty portfolio
    assert.equal(state.error?.includes('Failed to fetch holdings'), true)
  })

  it('3. A failed request is not interpreted as a successful empty response and allows retry', async () => {
    // Simulate transient database connection error
    mockTableError = {
      table: 'holdings',
      error: {
        message: 'connection timeout / network failure',
      },
    }

    await usePortfolioStore.getState().initializeUser(testUserId)

    let state = usePortfolioStore.getState()
    assert.ok(state.error !== null, 'Error must be populated on failure')
    assert.equal(state.isLoading, false, 'Loading must terminate on failure')

    // Now resolve the database error (database recovers)
    mockTableError = null
    mockTables.set('holdings', [
      {
        id: 'h_recovered',
        portfolio_id: 'port_1',
        user_id: testUserId,
        coin_id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 1,
        average_cost: 65000,
        first_bought_at: '2024-01-01T00:00:00Z',
        image: 'https://example.com/btc.png',
        notes: 'Cold storage',
      },
    ])

    // Trigger retrySync
    await usePortfolioStore.getState().retrySync()

    state = usePortfolioStore.getState()
    assert.equal(state.error, null, 'Error must clear after successful retry')
    assert.equal(state.holdings.length, 1)
    assert.equal(state.holdings[0].symbol, 'BTC')
  })

  it('4. A valid holdings response is processed and mapped correctly', async () => {
    const rawDbRow: DbHoldingRow = {
      id: 'h_101',
      portfolio_id: 'port_main',
      user_id: testUserId,
      coin_id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      quantity: '4.5',
      average_cost: '3200.75',
      first_bought_at: '2024-03-15T12:00:00Z',
      image: 'https://assets.coingecko.com/eth.png',
      notes: 'Staking pool',
    }

    const mapped = mapDbHoldingToModel(rawDbRow)
    assert.equal(mapped.id, 'h_101')
    assert.equal(mapped.coinId, 'ethereum')
    assert.equal(mapped.symbol, 'ETH')
    assert.equal(mapped.name, 'Ethereum')
    assert.equal(mapped.quantity, 4.5)
    assert.equal(mapped.avgBuyPrice, 3200.75)
    assert.equal(mapped.purchaseDate, '2024-03-15')
    assert.equal(mapped.image, 'https://assets.coingecko.com/eth.png')
    assert.equal(mapped.notes, 'Staking pool')
  })

  it('5. User data remains strictly isolated by user ID and Row Level Security logic', async () => {
    mockTables.set('holdings', [
      {
        id: 'h_alice',
        portfolio_id: 'port_a',
        user_id: testUserId,
        coin_id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 1,
        average_cost: 60000,
        first_bought_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'h_bob',
        portfolio_id: 'port_b',
        user_id: otherUserId,
        coin_id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        quantity: 50,
        average_cost: 150,
        first_bought_at: '2024-02-01T00:00:00Z',
      },
    ])

    // Fetch as Alice
    const aliceHoldings = await fetchUserHoldings(testUserId)
    assert.equal(aliceHoldings.length, 1)
    assert.equal(aliceHoldings[0].symbol, 'BTC')

    // Fetch as Bob
    const bobHoldings = await fetchUserHoldings(otherUserId)
    assert.equal(bobHoldings.length, 1)
    assert.equal(bobHoldings[0].symbol, 'SOL')
  })

  it('6. SQL migrations create public.holdings with all required columns and RLS', () => {
    const initialSqlPath = path.resolve(process.cwd(), 'supabase/migrations/20240101000000_initial_schema.sql')
    const phase3SqlPath = path.resolve(process.cwd(), 'supabase/migrations/20240102000000_phase3_user_persistence.sql')

    assert.ok(fs.existsSync(initialSqlPath), 'initial_schema.sql must exist')
    assert.ok(fs.existsSync(phase3SqlPath), 'phase3_user_persistence.sql must exist')

    const initialSql = fs.readFileSync(initialSqlPath, 'utf8')
    const phase3Sql = fs.readFileSync(phase3SqlPath, 'utf8')

    // Check table creation
    assert.ok(initialSql.includes('CREATE TABLE IF NOT EXISTS holdings'), 'Creates holdings table')
    assert.ok(initialSql.includes('portfolio_id UUID NOT NULL REFERENCES portfolios(id)'), 'Foreign key to portfolios')
    assert.ok(initialSql.includes('user_id UUID NOT NULL REFERENCES auth.users(id)'), 'Foreign key to auth.users')
    assert.ok(initialSql.includes('quantity DECIMAL'), 'Defines quantity')
    assert.ok(initialSql.includes('average_cost DECIMAL'), 'Defines average_cost')
    assert.ok(initialSql.includes('ALTER TABLE holdings ENABLE ROW LEVEL SECURITY'), 'Enables RLS')

    // Check phase 3 updates
    assert.ok(phase3Sql.includes('ALTER TABLE holdings ADD COLUMN IF NOT EXISTS notes TEXT'), 'Adds notes column')
    assert.ok(phase3Sql.includes('ALTER TABLE holdings ADD COLUMN IF NOT EXISTS image TEXT'), 'Adds image column')
    assert.ok(phase3Sql.includes('CREATE POLICY "Users can view own holdings" ON holdings'), 'Defines SELECT policy')
    assert.ok(phase3Sql.includes('CREATE POLICY "Users can insert own holdings" ON holdings'), 'Defines INSERT policy')
    assert.ok(phase3Sql.includes('CREATE POLICY "Users can update own holdings" ON holdings'), 'Defines UPDATE policy')
    assert.ok(phase3Sql.includes('CREATE POLICY "Users can delete own holdings" ON holdings'), 'Defines DELETE policy')

    // Check trigger DELETE handling safety
    assert.ok(initialSql.includes("IF (TG_OP = 'DELETE')"), 'Trigger in initial_schema handles DELETE safely')
    assert.ok(phase3Sql.includes("IF (TG_OP = 'DELETE')"), 'Trigger in phase3 handles DELETE safely')
  })
})
