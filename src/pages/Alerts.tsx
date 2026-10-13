import { useState } from 'react'
import { useAlertStore } from '@/store/useAlertStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { CreateAlertModal } from '@/components/alerts/CreateAlertModal'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'

export default function Alerts() {
  const { alerts, deleteAlert, toggleAlert, updateAlert, clearTriggered } = useAlertStore()
  const { prices: livePrices } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'triggered' | 'active'>('all')

  const triggeredCount = alerts.filter(a => a.triggered).length
  const activeCount = alerts.filter(a => a.enabled && !a.triggered).length

  const filteredAlerts = alerts.filter(alert => {
    if (filterMode === 'triggered') return alert.triggered
    if (filterMode === 'active') return alert.enabled && !alert.triggered
    return true
  })

  const handleToggle = (id: string, isTriggered: boolean) => {
    if (isTriggered) {
      // Re-arm triggered alert
      updateAlert(id, { triggered: false, enabled: true })
    } else {
      toggleAlert(id)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">Alerts</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Smart price monitoring &bull; {activeCount} active &bull; {triggeredCount} triggered
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setFilterMode('all')}
              className={`rounded-xl px-3 py-1.5 font-medium transition-all ${
                filterMode === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`rounded-xl px-3 py-1.5 font-medium transition-all ${
                filterMode === 'active' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterMode('triggered')}
              className={`relative rounded-xl px-3 py-1.5 font-medium transition-all ${
                filterMode === 'triggered' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Triggered ({triggeredCount})
            </button>
          </div>

          {triggeredCount > 0 && (
            <button
              onClick={clearTriggered}
              title="Reset all triggered alerts back to active"
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Triggered
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> New Alert
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <GlassCard padding="sm">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
            <div className="text-xl font-medium text-slate-900 dark:text-white">
              {filterMode === 'triggered' ? 'No triggered alerts' : filterMode === 'active' ? 'No active alerts' : 'No alerts yet'}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {filterMode === 'all' ? 'Create your first price alert to track target movements.' : 'Change filter mode to view all alerts.'}
            </p>
            {filterMode === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-5 rounded-2xl bg-slate-100 px-6 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Create your first alert
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAlerts.map((alert) => {
              const live = livePrices[alert.symbol.toUpperCase()] || livePrices[alert.symbol]
              return (
                <div key={alert.id} className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div>
                    <div className="font-medium flex items-center gap-3 text-slate-900 dark:text-white">
                      <span className="text-base font-semibold">{alert.symbol.toUpperCase()}</span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Target: {alert.type.includes('PRICE') ? '$' : ''}{alert.value.toLocaleString()}
                      {live ? (
                        <span className="ml-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          Current: ${live.price.toLocaleString()} ({live.change >= 0 ? '+' : ''}{live.change.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="ml-3 text-xs text-slate-400">Awaiting market feed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {alert.triggered ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Triggered
                      </span>
                    ) : alert.enabled ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-500">
                        Paused
                      </span>
                    )}

                    <button
                      onClick={() => handleToggle(alert.id, alert.triggered)}
                      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      title={alert.triggered ? 'Re-arm alert' : alert.enabled ? 'Pause alert' : 'Activate alert'}
                    >
                      {alert.enabled && !alert.triggered ? (
                        <ToggleRight className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-400" />
                      )}
                    </button>

                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      <CreateAlertModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}