import { useState } from 'react'
import { useAlertStore } from '@/store/useAlertStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { CreateAlertModal } from '@/components/alerts/CreateAlertModal'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

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
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F4F8]">
              Price Alerts
            </h1>
            <span className="text-[11px] font-medium font-mono text-[#94A3B8] bg-[#151921] border border-[#262D38] px-2 py-0.5 rounded-full">
              {alerts.length} Total
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            Automated price triggers &bull; {activeCount} active &bull; {triggeredCount} triggered
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {triggeredCount > 0 && (
            <button
              onClick={clearTriggered}
              title="Reset all triggered alerts back to active"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#151921] px-3 py-1.5 text-xs font-medium text-[#F0F4F8] hover:bg-[#1E232E] hover:text-[#FFB300] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Triggered</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Alert</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-[#262D38] bg-[#151921] p-2">
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: `All (${alerts.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'triggered', label: `Triggered (${triggeredCount})` },
          ].map((tab) => {
            const isActive = filterMode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id as 'all' | 'triggered' | 'active')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1E232E] text-[#FFB300] font-semibold border border-[#FFB300]/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="text-[11px] font-mono text-[#94A3B8] px-1 hidden sm:block">
          Showing <span className="text-[#F0F4F8] font-semibold">{filteredAlerts.length}</span> alerts
        </div>
      </div>

      {/* 3. Alerts Card List */}
      <div className="rounded-xl border border-[#262D38] bg-[#151921] overflow-hidden shadow-sm">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8 text-[#94A3B8]" />}
            title={
              filterMode === 'triggered'
                ? 'No triggered alerts'
                : filterMode === 'active'
                ? 'No active alerts'
                : 'No price alerts configured'
            }
            description={
              filterMode === 'all'
                ? 'Create your first price alert to track target movements and market shifts.'
                : 'Change your filter view to see alerts in other states.'
            }
            action={
              filterMode === 'all' ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
                >
                  Create your first alert
                </button>
              ) : (
                <button
                  onClick={() => setFilterMode('all')}
                  className="text-xs text-[#FFB300] hover:text-[#FFA000] font-medium underline cursor-pointer"
                >
                  View all alerts
                </button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-[#262D38]/50">
            {filteredAlerts.map((alert) => {
              const live = livePrices[alert.symbol.toUpperCase()] || livePrices[alert.symbol]
              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-[#1E232E] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-[#F0F4F8] font-heading">
                        {alert.symbol.toUpperCase()}
                      </span>
                      <span className="rounded bg-[#1E232E] border border-[#262D38] px-2 py-0.5 text-[10px] font-mono text-[#94A3B8] uppercase">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                      <span>Target: <span className="font-mono text-[#F0F4F8] font-semibold">{alert.type.includes('PRICE') ? '$' : ''}{alert.value.toLocaleString()}</span></span>
                      {live ? (
                        <>
                          <span className="text-[#262D38]">&bull;</span>
                          <span className="font-mono text-xs text-[#94A3B8]">
                            Current: <span className="text-[#F0F4F8]">${live.price.toLocaleString()}</span> (<span className={live.change >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}>{live.change >= 0 ? '+' : ''}{live.change.toFixed(2)}%</span>)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#262D38]">&bull;</span>
                          <span className="text-[11px] text-[#94A3B8]">Awaiting market feed</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5">
                    {alert.triggered ? (
                      <span className="rounded border border-[#FFB300]/30 bg-[#FFB300]/10 px-2.5 py-0.5 text-xs font-medium text-[#FFB300]">
                        Triggered
                      </span>
                    ) : alert.enabled ? (
                      <span className="rounded border border-[#00E676]/30 bg-[#00E676]/10 px-2.5 py-0.5 text-xs font-medium text-[#00E676]">
                        Active
                      </span>
                    ) : (
                      <span className="rounded border border-[#262D38] bg-[#1E232E] px-2.5 py-0.5 text-xs font-medium text-[#94A3B8]">
                        Paused
                      </span>
                    )}

                    <button
                      onClick={() => handleToggle(alert.id, alert.triggered)}
                      className="text-[#94A3B8] hover:text-[#F0F4F8] transition-colors cursor-pointer"
                      title={alert.triggered ? 'Re-arm alert' : alert.enabled ? 'Pause alert' : 'Activate alert'}
                      aria-label={alert.triggered ? `Re-arm ${alert.symbol} alert` : alert.enabled ? `Pause ${alert.symbol} alert` : `Activate ${alert.symbol} alert`}
                    >
                      {alert.enabled && !alert.triggered ? (
                        <ToggleRight className="h-5 w-5 text-[#00E676]" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-[#94A3B8]" />
                      )}
                    </button>

                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="rounded p-1 text-[#94A3B8] hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors cursor-pointer"
                      title="Delete alert"
                      aria-label={`Delete ${alert.symbol} alert`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateAlertModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}