import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

const notifications = [
  { id: 1, title: 'Portfolio synced', detail: 'Your balances are up to date.', time: 'just now' },
  { id: 2, title: 'Watchlist refreshed', detail: 'New market signals are ready.', time: '14m ago' },
  { id: 3, title: 'Alert threshold reached', detail: 'Your BTC alert is now active.', time: '2h ago' },
]

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const { preferences } = useAuthStore()
  const isDark = preferences.theme === 'dark'

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all active:scale-[0.96] ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'}`}
      >
        <Bell className={`h-4 w-4 ${isDark ? 'text-slate-200' : 'text-slate-600'}`} />
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={`absolute right-0 top-12 z-50 w-80 rounded-[24px] border p-1 shadow-xl backdrop-blur-xl ${isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'}`}
          >
            <div className={`border-b px-4 py-3 text-sm font-medium ${isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-900'}`}>Notifications</div>

            <div className="py-1">
              {notifications.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  whileHover={{ x: 2, scale: 1.002 }}
                  className={`flex gap-3 rounded-2xl px-4 py-[13px] ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'}`}
                >
                  <div className="mt-0.5 rounded-xl bg-violet-100 p-2 text-violet-700">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.detail} • {item.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className={`border-t px-4 py-3 text-center text-xs ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>View all activity</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}