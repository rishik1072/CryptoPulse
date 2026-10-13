import { supabase } from '../lib/supabase.ts'
import type { Holding } from '../store/usePortfolioStore.ts'

export interface DbHoldingRow {
  id: string
  portfolio_id: string
  user_id: string
  coin_id: string
  symbol: string
  name: string
  quantity: number | string
  average_cost: number | string
  first_bought_at: string | null
  image?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export function mapDbHoldingToModel(row: DbHoldingRow): Holding {
  return {
    id: row.id,
    coinId: row.coin_id,
    symbol: row.symbol.toUpperCase(),
    name: row.name,
    image: row.image || '',
    quantity: typeof row.quantity === 'number' ? row.quantity : parseFloat(String(row.quantity)) || 0,
    avgBuyPrice: typeof row.average_cost === 'number' ? row.average_cost : parseFloat(String(row.average_cost)) || 0,
    purchaseDate: row.first_bought_at ? row.first_bought_at.split('T')[0] : new Date().toISOString().split('T')[0],
    notes: row.notes || undefined,
  }
}

export async function getUserDefaultPortfolio(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query user portfolio: ${error.message}`)
  }

  if (data?.id) {
    return data.id
  }

  // Create default portfolio if absent
  const { data: created, error: insertError } = await supabase
    .from('portfolios')
    .insert({
      user_id: userId,
      name: 'Main Portfolio',
      is_default: true,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    throw new Error(`Failed to create default portfolio: ${insertError?.message || 'Unknown error'}`)
  }

  return created.id
}

export async function fetchUserHoldings(userId: string): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch holdings: ${error.message}`)
  }

  return (data || []).map(mapDbHoldingToModel)
}

export async function insertHoldingDb(
  userId: string,
  holding: Omit<Holding, 'id'>
): Promise<Holding> {
  const portfolioId = await getUserDefaultPortfolio(userId)

  const payload = {
    user_id: userId,
    portfolio_id: portfolioId,
    coin_id: holding.coinId,
    symbol: holding.symbol.toUpperCase(),
    name: holding.name || holding.symbol.toUpperCase(),
    quantity: holding.quantity,
    average_cost: holding.avgBuyPrice,
    first_bought_at: holding.purchaseDate ? new Date(holding.purchaseDate).toISOString() : new Date().toISOString(),
    image: holding.image || null,
    notes: holding.notes || null,
  }

  const { data, error } = await supabase
    .from('holdings')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to save holding to database: ${error?.message || 'Insert returned no data'}`)
  }

  return mapDbHoldingToModel(data)
}

export async function updateHoldingDb(
  userId: string,
  holdingId: string,
  updates: Partial<Holding>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}

  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
  if (updates.avgBuyPrice !== undefined) dbUpdates.average_cost = updates.avgBuyPrice
  if (updates.symbol !== undefined) dbUpdates.symbol = updates.symbol.toUpperCase()
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.image !== undefined) dbUpdates.image = updates.image
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes
  if (updates.purchaseDate !== undefined) {
    dbUpdates.first_bought_at = new Date(updates.purchaseDate).toISOString()
  }

  dbUpdates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('holdings')
    .update(dbUpdates)
    .eq('id', holdingId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update holding: ${error.message}`)
  }
}

export async function deleteHoldingDb(userId: string, holdingId: string): Promise<void> {
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', holdingId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to remove holding: ${error.message}`)
  }
}
