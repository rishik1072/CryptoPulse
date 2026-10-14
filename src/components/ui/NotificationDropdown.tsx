import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, CheckCheck, Trash2, ArrowRight } from 'lucide-react'
import { useAlertStore } from '@/store/useAlertStore'

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const { alerts, clearTriggered } = useAlertStore()

  const triggeredAlerts = alerts.filter((a) => a.triggered)
  const hasUnread = triggeredAlerts.length > 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#262D38] bg-[#1E232E] text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#262D38] transition-colors"
        aria-label="View notifications"
        aria-expanded={open}
      >
        <Bell className="h-3.5 w-3.5" />
        {hasUnread && (
          <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FFB300] ring-2 ring-[#151921] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-surface shadow-2xl backdrop-blur-md overflow-hidden text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-3.5 py-2.5 text-xs font-semibold text-foreground">
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {hasUnread && (
                  <span className="rounded-full bg-[#FFB300]/20 px-2 py-0.2 text-[10px] font-mono font-medium text-[#FFB300]">
                    {triggeredAlerts.length}
                  </span>
                )}
              </div>
              {hasUnread && (
                <button
                  onClick={() => clearTriggered()}
                  className="flex items-center gap-1 text-[11px] font-normal text-[#94A3B8] hover:text-[#FF5252] transition-colors cursor-pointer"
                  title="Clear all triggered notifications"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
              {triggeredAlerts.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <CheckCheck className="mx-auto h-7 w-7 mb-2 text-[#94A3B8]/40" />
                  <div className="text-xs font-medium text-[#94A3B8]">
                    All caught up
                  </div>
                  <p className="mt-1 text-[11px] text-[#94A3B8]/70 max-w-[200px] mx-auto">
                    Active price alerts will appear here when triggered.
                  </p>
                </div>
              ) : (
                triggeredAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    className="flex items-start gap-2.5 rounded-lg p-2.5 hover:bg-[#1E232E] transition-colors"
                  >
                    <div className="mt-0.5 rounded-md bg-[#FFB300]/15 p-1.5 text-[#FFB300] shrink-0 border border-[#FFB300]/30">
                      <BellRing className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#F0F4F8]">
                        {alert.symbol.toUpperCase()} Alert Triggered
                      </div>
                      <div className="text-[11px] mt-0.5 text-[#94A3B8]">
                        Target of {alert.type.replace(/_/g, ' ')} (${alert.value.toLocaleString()}) met
                      </div>
                      <div className="text-[10px] mt-1 font-mono text-[#94A3B8]/70">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="border-t border-[#262D38] bg-[#0B0E14] px-3.5 py-2 text-center text-xs">
              <Link
                to="/alerts"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors"
              >
                <span>Manage all price alerts</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}