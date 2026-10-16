import { create } from 'zustand'
import {
  fetchUserAlerts,
  insertAlertDb,
  updateAlertDb,
  deleteAlertDb,
  toggleAlertDb,
  markTriggeredDb,
  clearTriggeredDb,
} from '../services/alertService.ts'

export type AlertType = 
  | 'PRICE_ABOVE' 
  | 'PRICE_BELOW' 
  | 'PERCENT_CHANGE' 
  | 'DAILY_HIGH' 
  | 'DAILY_LOW' 
  | 'VOLUME_SPIKE'

export interface Alert {
  id: string
  symbol: string
  type: AlertType
  value: number
  enabled: boolean
  triggered: boolean
  createdAt: string
}

interface AlertState {
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  userId: string | null
  initializeUser: (userId: string) => Promise<void>
  addAlert: (alert: Omit<Alert, 'id' | 'triggered' | 'createdAt'>) => Promise<boolean>
  updateAlert: (id: string, updates: Partial<Alert>) => Promise<boolean>
  deleteAlert: (id: string) => Promise<boolean>
  toggleAlert: (id: string) => Promise<boolean>
  markTriggered: (id: string) => Promise<boolean>
  clearTriggered: () => Promise<boolean>
  clearAlerts: () => void
}

function getCacheKey(userId: string): string {
  return `cryptopulse-alerts-${userId}`
}

function loadFromUserCache(userId: string): Alert[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToUserCache(userId: string, alerts: Alert[]): void {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(alerts))
  } catch {
    // Ignore storage quota errors
  }
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,
  userId: null,

  initializeUser: async (userId: string) => {
    const cached = loadFromUserCache(userId)
    if (userId.startsWith('demo-')) {
      set({ userId, alerts: cached, isLoading: false, error: null })
      return
    }
    set({ userId, alerts: cached, isLoading: true, error: null })

    try {
      const dbAlerts = await fetchUserAlerts(userId)
      set({ alerts: dbAlerts, isLoading: false, error: null })
      saveToUserCache(userId, dbAlerts)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synchronize alerts with database.'
      set({ isLoading: false, error: message })
    }
  },

  addAlert: async (alertData) => {
    const { userId, alerts } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to create alerts.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      const persisted = await insertAlertDb(userId, alertData)
      const nextAlerts = [...alerts, persisted]
      set({ alerts: nextAlerts, isLoading: false, error: null })
      saveToUserCache(userId, nextAlerts)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while creating alert.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  updateAlert: async (id, updates) => {
    const { userId, alerts } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to update alerts.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      await updateAlertDb(userId, id, updates)
      const nextAlerts = alerts.map((alert) =>
        alert.id === id ? { ...alert, ...updates } : alert
      )
      set({ alerts: nextAlerts, isLoading: false, error: null })
      saveToUserCache(userId, nextAlerts)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while updating alert.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  deleteAlert: async (id) => {
    const { userId, alerts } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to delete alerts.' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      await deleteAlertDb(userId, id)
      const nextAlerts = alerts.filter((alert) => alert.id !== id)
      set({ alerts: nextAlerts, isLoading: false, error: null })
      saveToUserCache(userId, nextAlerts)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while deleting alert.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  toggleAlert: async (id) => {
    const { userId, alerts } = get()
    if (!userId) {
      set({ error: 'User must be authenticated to toggle alert.' })
      return false
    }

    const currentAlert = alerts.find((a) => a.id === id)
    if (!currentAlert) return false
    const nextEnabled = !currentAlert.enabled

    set({ isLoading: true, error: null })

    try {
      await toggleAlertDb(userId, id, nextEnabled)
      const nextAlerts = alerts.map((alert) =>
        alert.id === id ? { ...alert, enabled: nextEnabled } : alert
      )
      set({ alerts: nextAlerts, isLoading: false, error: null })
      saveToUserCache(userId, nextAlerts)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database error while updating alert status.'
      set({ isLoading: false, error: message })
      return false
    }
  },

  markTriggered: async (id) => {
    const { userId, alerts } = get()
    const targetAlert = alerts.find((a) => a.id === id)
    if (!targetAlert || targetAlert.triggered) return true

    // Optimistically update in memory for alert engine immediacy
    const nextAlerts = alerts.map((alert) =>
      alert.id === id ? { ...alert, triggered: true } : alert
    )
    set({ alerts: nextAlerts })
    if (userId) {
      saveToUserCache(userId, nextAlerts)
      try {
        await markTriggeredDb(userId, id)
      } catch (err) {
        console.warn('[AlertStore] Background sync of triggered alert failed:', err)
      }
    }
    return true
  },

  clearTriggered: async () => {
    const { userId, alerts } = get()
    const nextAlerts = alerts.map((alert) => ({ ...alert, triggered: false }))
    set({ alerts: nextAlerts })

    if (userId) {
      saveToUserCache(userId, nextAlerts)
      try {
        await clearTriggeredDb(userId)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to clear triggered alerts in database.'
        set({ error: message })
        return false
      }
    }
    return true
  },

  clearAlerts: () => {
    set({ alerts: [], userId: null, error: null, isLoading: false })
  },
}))