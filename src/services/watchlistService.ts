import { supabase } from '../lib/supabase.ts'
import type { WatchlistItem } from '../store/useWatchlistStore.ts'

export interface DbWatchlistItemRow {
  id: string
  watchlist_id: string
  user_id: string
  coin_id: string
  symbol: string
  name: string
  image?: string | null
  pinned?: boolean | null
  added_at?: string | null
}

export function mapDbWatchlistItemToModel(row: DbWatchlistItemRow): WatchlistItem {
  return {
    id: row.id,
    coinId: row.coin_id,
    symbol: row.symbol.toUpperCase(),
    name: row.name,
    image: row.image || '',
    pinned: Boolean(row.pinned),
    addedAt: row.added_at || new Date().toISOString(),
  }
}

export async function getUserDefaultWatchlist(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query user watchlist: ${error.message}`)
  }

  if (data?.id) {
    return data.id
  }

  const { data: created, error: insertError } = await supabase
    .from('watchlists')
    .insert({
      user_id: userId,
      name: 'Default Watchlist',
      is_default: true,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    throw new Error(`Failed to create default watchlist: ${insertError?.message || 'Unknown error'}`)
  }

  return created.id
}

export async function fetchUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (userId.startsWith('demo-')) {
    return []
  }
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch watchlist items: ${error.message}`)
  }

  return (data || []).map(mapDbWatchlistItemToModel)
}

export async function insertWatchlistItemDb(
  userId: string,
  item: Omit<WatchlistItem, 'id' | 'pinned' | 'addedAt'>
): Promise<WatchlistItem> {
  const watchlistId = await getUserDefaultWatchlist(userId)

  const payload = {
    user_id: userId,
    watchlist_id: watchlistId,
    coin_id: item.coinId,
    symbol: item.symbol.toUpperCase(),
    name: item.name || item.symbol.toUpperCase(),
    image: item.image || null,
    pinned: false,
    added_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .upsert(payload, { onConflict: 'watchlist_id,coin_id' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to add coin to watchlist database: ${error?.message || 'Database returned no data'}`)
  }

  return mapDbWatchlistItemToModel(data)
}

export async function removeWatchlistItemDb(userId: string, coinId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('coin_id', coinId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to remove coin from watchlist: ${error.message}`)
  }
}

export async function togglePinWatchlistItemDb(
  userId: string,
  coinId: string,
  pinned: boolean
): Promise<void> {
  const { error } = await supabase
    .from('watchlist_items')
    .update({ pinned })
    .eq('coin_id', coinId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update watchlist pin state: ${error.message}`)
  }
}
