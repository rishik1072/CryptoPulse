import { useEffect } from 'react'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAlertStore } from '@/store/useAlertStore'
import { toast } from 'sonner'

export function useAlertEngine() {
  const { prices } = useLivePriceStore()
  const { alerts, markTriggered } = useAlertStore()

  useEffect(() => {
    const activeAlerts = alerts.filter(a => a.enabled && !a.triggered)

    activeAlerts.forEach(alert => {
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
          // Volume spike detection (simplified)
          triggered = live.volume > alert.value * 1_000_000
          break
      }

      if (triggered) {
        // In-app toast
        toast.success(`${alert.symbol.toUpperCase()} Alert Triggered`, {
          description: `${alert.type.replace(/_/g, ' ')} target of ${alert.value} met (Current: $${live.price.toLocaleString()})`,
          duration: 8000,
        })

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`${alert.symbol.toUpperCase()} Alert`, {
              body: `${alert.type.replace(/_/g, ' ')} condition met at $${live.price.toLocaleString()}`,
            })
          } catch {
            // Non-critical: browser notification could fail
          }
        }

        markTriggered(alert.id)
      }
    })
  }, [prices, alerts, markTriggered])
}