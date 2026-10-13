import { useEffect, useRef } from 'react'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export function useAlertEngine() {
  const { prices } = useLivePriceStore()
  const { alerts, markTriggered } = useAlertStore()
  const { preferences } = useAuthStore()

  // Track alerts currently being triggered to prevent duplicate notifications during rapid ticks
  const inFlightAlerts = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Clear out inFlight alerts that are no longer active
    for (const id of inFlightAlerts.current) {
      const match = alerts.find((a) => a.id === id)
      if (!match || match.triggered || !match.enabled) {
        inFlightAlerts.current.delete(id)
      }
    }

    const activeAlerts = alerts.filter((a) => a.enabled && !a.triggered)

    activeAlerts.forEach((alert) => {
      if (inFlightAlerts.current.has(alert.id)) return

      const live = prices[alert.symbol.toUpperCase()] || prices[alert.symbol]
      if (!live || !Number.isFinite(live.price) || live.price <= 0) return

      let triggered = false

      switch (alert.type) {
        case 'PRICE_ABOVE':
          triggered = live.price > alert.value
          break
        case 'PRICE_BELOW':
          triggered = live.price < alert.value
          break
        case 'PERCENT_CHANGE':
          triggered = Math.abs(live.change) >= alert.value
          break
        case 'DAILY_HIGH':
          triggered = live.high24h !== undefined ? live.high24h >= alert.value : false
          break
        case 'DAILY_LOW':
          triggered = live.low24h !== undefined ? live.low24h <= alert.value : false
          break
        case 'VOLUME_SPIKE':
          triggered = live.volume > alert.value * 1_000_000
          break
      }

      if (triggered) {
        inFlightAlerts.current.add(alert.id)

        // Respect user notification preferences
        const canNotifyInApp = preferences.notifications !== false && preferences.priceAlerts !== false
        const canNotifyBrowser = preferences.notifications !== false && preferences.browserNotifications === true

        if (canNotifyInApp) {
          toast.success(`${alert.symbol.toUpperCase()} Alert Triggered`, {
            description: `${alert.type.replace(/_/g, ' ')} target of ${alert.value} reached (Current: $${live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
            duration: 8000,
          })
        }

        if (canNotifyBrowser && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`${alert.symbol.toUpperCase()} Alert`, {
              body: `${alert.type.replace(/_/g, ' ')} condition met at $${live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            })
          } catch {
            // Non-critical browser notification error
          }
        }

        void markTriggered(alert.id)
      }
    })
  }, [prices, alerts, markTriggered, preferences])
}