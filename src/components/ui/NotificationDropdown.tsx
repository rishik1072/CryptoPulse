import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, CheckCheck, Trash2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAlertStore } from '@/store/useAlertStore'

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const { preferences } = useAuthStore()
  const { alerts, clearTriggered } = useAlertStore()
  const isDark = preferences.theme === 'dark'

  const triggeredAlerts = alerts.filter((a) => a.triggered)
  const hasUnread = triggeredAlerts.length > 0

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all active:scale-[0.96] ${
          isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
        }`}
        aria-label="View notifications"
        aria-expanded={open}
      >
        <Bell className={`h-4 w-4 ${isDark ? 'text-slate-200' : 'text-slate-600'}`} />
        {hasUnread && (
          <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute right-0 top-12 z-50 w-84 rounded-[24px] border p-1 shadow-2xl backdrop-blur-xl ${
              isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'
            }`}
          >
            <div className={`flex items-center justify-between border-b px-4 py-3 text-sm font-semibold ${
              isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {hasUnread && (
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-violet-600 dark:text-violet-400">
                    {triggeredAlerts.length}
                  </span>
                )}
              </div>
              {hasUnread && (
                <button
                  onClick={() => clearTriggered()}
                  className="flex items-center gap-1 text-[11px] font-normal text-slate-400 hover:text-rose-500 transition-colors"
                  title="Clear all triggered notifications"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {triggeredAlerts.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <CheckCheck className={`mx-auto h-8 w-8 mb-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    All caught up
                  </div>
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} max-w-[200px] mx-auto`}>
                    Active market price alerts will notify you here when triggered.
                  </p>
                </div>
              ) : (
                triggeredAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    whileHover={{ x: 2, scale: 1.002 }}
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 rounded-xl bg-violet-100 dark:bg-violet-950/40 p-2 text-violet-700 dark:text-violet-300 flex-shrink-0">
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {alert.symbol.toUpperCase()} Alert Triggered
                      </div>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Target of {alert.type.replace(/_/g, ' ')} (${alert.value.toLocaleString()}) met
                      </div>
                      <div className={`text-[10px] mt-1 font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className={`border-t px-4 py-2.5 text-center text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <Link
                to="/alerts"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 font-medium text-violet-600 dark:text-violet-400 hover:underline"
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