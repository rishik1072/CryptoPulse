import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addAlert: (alert: Omit<Alert, 'id' | 'triggered' | 'createdAt'>) => void
  updateAlert: (id: string, updates: Partial<Alert>) => void
  deleteAlert: (id: string) => void
  toggleAlert: (id: string) => void
  markTriggered: (id: string) => void
  clearTriggered: () => void
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],

      addAlert: (alertData) => {
        const newAlert: Alert = {
          ...alertData,
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          triggered: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ alerts: [...state.alerts, newAlert] }))
      },

      updateAlert: (id, updates) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, ...updates } : alert
          ),
        }))
      },

      deleteAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }))
      },

      toggleAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
          ),
        }))
      },

      markTriggered: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, triggered: true } : alert
          ),
        }))
      },

      clearTriggered: () => {
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, triggered: false })),
        }))
      },
    }),
    {
      name: 'cryptopulse-alerts',
      version: 1,
    }
  )
)