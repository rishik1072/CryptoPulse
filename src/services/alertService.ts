import { supabase } from '../lib/supabase.ts'
import type { Alert, AlertType } from '../store/useAlertStore.ts'

export interface DbAlertRow {
  id: string
  user_id: string
  coin_id?: string | null
  symbol: string
  name?: string | null
  type: string
  condition?: string | null
  target_value: number | string
  current_value?: number | string | null
  is_active: boolean
  is_triggered: boolean
  triggered_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function resolveConditionForType(type: AlertType): string {
  switch (type) {
    case 'PRICE_BELOW':
    case 'DAILY_LOW':
      return 'below'
    case 'PRICE_ABOVE':
    case 'DAILY_HIGH':
      return 'above'
    case 'PERCENT_CHANGE':
      return 'increase'
    case 'VOLUME_SPIKE':
      return 'increase'
    default:
      return 'above'
  }
}

export function mapDbAlertToModel(row: DbAlertRow): Alert {
  return {
    id: row.id,
    symbol: row.symbol.toUpperCase(),
    type: row.type as AlertType,
    value: typeof row.target_value === 'number' ? row.target_value : parseFloat(String(row.target_value)) || 0,
    enabled: Boolean(row.is_active),
    triggered: Boolean(row.is_triggered),
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export async function fetchUserAlerts(userId: string): Promise<Alert[]> {
  if (userId.startsWith('demo-')) {
    return []
  }
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch alerts: ${error.message}`)
  }

  return (data || []).map(mapDbAlertToModel)
}

export async function insertAlertDb(
  userId: string,
  alert: Omit<Alert, 'id' | 'triggered' | 'createdAt'>
): Promise<Alert> {
  const payload = {
    user_id: userId,
    coin_id: alert.symbol.toLowerCase(),
    symbol: alert.symbol.toUpperCase(),
    name: alert.symbol.toUpperCase(),
    type: alert.type,
    condition: resolveConditionForType(alert.type),
    target_value: alert.value,
    is_active: alert.enabled !== false,
    is_triggered: false,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create alert in database: ${error?.message || 'Database returned no data'}`)
  }

  return mapDbAlertToModel(data)
}

export async function updateAlertDb(
  userId: string,
  alertId: string,
  updates: Partial<Alert>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}

  if (updates.value !== undefined) dbUpdates.target_value = updates.value
  if (updates.symbol !== undefined) dbUpdates.symbol = updates.symbol.toUpperCase()
  if (updates.type !== undefined) {
    dbUpdates.type = updates.type
    dbUpdates.condition = resolveConditionForType(updates.type)
  }
  if (updates.enabled !== undefined) dbUpdates.is_active = updates.enabled
  if (updates.triggered !== undefined) {
    dbUpdates.is_triggered = updates.triggered
    if (updates.triggered) {
      dbUpdates.triggered_at = new Date().toISOString()
    }
  }

  dbUpdates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('alerts')
    .update(dbUpdates)
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update alert: ${error.message}`)
  }
}

export async function deleteAlertDb(userId: string, alertId: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete alert: ${error.message}`)
  }
}

export async function toggleAlertDb(userId: string, alertId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_active: enabled, updated_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to toggle alert status: ${error.message}`)
  }
}

export async function markTriggeredDb(userId: string, alertId: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({
      is_triggered: true,
      triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    console.warn(`[AlertService] Failed to mark alert triggered in database: ${error.message}`)
  }
}

export async function clearTriggeredDb(userId: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({
      is_triggered: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to clear triggered alerts: ${error.message}`)
  }
}
