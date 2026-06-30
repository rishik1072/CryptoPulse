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
      const live = prices[alert.symbol]
      if (!live) return

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
        case 'VOLUME_SPIKE':
          // Volume spike detection (simplified)
          triggered = live.volume > alert.value * 1_000_000
          break
      }

      if (triggered) {
        // In-app toast
        toast.success(`${alert.symbol} Alert Triggered`, {
          description: `${alert.type} @ ${alert.value}`,
          duration: 8000,
        })

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${alert.symbol} Alert`, {
            body: `${alert.type} condition met`,
          })
        }

        markTriggered(alert.id)
      }
    })
  }, [prices, alerts, markTriggered])
}