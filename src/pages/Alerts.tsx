import { useState } from 'react'
import { useAlertStore } from '@/store/useAlertStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { CreateAlertModal } from '@/components/alerts/CreateAlertModal'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
// Unused imports removed

export default function Alerts() {
  const { alerts, deleteAlert, toggleAlert, markTriggered } = useAlertStore()
  const { prices: livePrices } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Check for triggered alerts
  const triggeredAlerts = alerts.filter(alert => {
    if (!alert.enabled || alert.triggered) return false
    const live = livePrices[alert.symbol]
    if (!live) return false

    switch (alert.type) {
      case 'PRICE_ABOVE':
        return live.price > alert.value
      case 'PRICE_BELOW':
        return live.price < alert.value
      case 'PERCENT_CHANGE':
        return Math.abs(live.change) >= alert.value
      default:
        return false
    }
  })

  // Show toast when alert triggers
  triggeredAlerts.forEach(alert => {
    // In real app we would use sonner toast here
    console.log(`[ALERT] ${alert.symbol} triggered: ${alert.type} @ ${alert.value}`)
    markTriggered(alert.id)
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Alerts</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Smart price monitoring • {alerts.length} active</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 transition-all hover:bg-white/5"
          >
            <Bell className="h-4 w-4" />
            Notifications
            {triggeredAlerts.length > 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-xs flex items-center justify-center">
                {triggeredAlerts.length}
              </div>
            )}
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-medium text-slate-950 transition-all hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> New Alert
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <GlassCard padding="sm">
        {alerts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-2xl font-medium text-slate-300">No alerts yet</div>
            <p className="mt-2 text-sm text-slate-400">Create your first alert to keep track of opportunities.</p>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="mt-5 rounded-2xl bg-white/5 px-6 py-2 text-sm transition-all hover:bg-white/10"
            >
              Create your first alert
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <div className="font-medium flex items-center gap-3">
                    {alert.symbol}
                    <span className="text-xs px-2.5 py-px rounded-full bg-white/10 text-muted">
                      {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-muted mt-0.5">
                    {alert.type.includes('PRICE') ? '$' : ''}{alert.value}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className={`text-sm px-3 py-1 rounded-full ${alert.enabled ? 'bg-success/10 text-success' : 'bg-white/10 text-muted'}`}>
                    {alert.enabled ? 'Active' : 'Paused'}
                  </div>

                  <button onClick={() => toggleAlert(alert.id)} className="text-muted hover:text-white">
                    {alert.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>

                  <button onClick={() => deleteAlert(alert.id)} className="text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <CreateAlertModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}