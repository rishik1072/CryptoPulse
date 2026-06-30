import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, TrendingUp } from 'lucide-react'

const notifications = [
  { id: 1, title: 'BTC crossed $102k', time: 'just now', type: 'success' },
  { id: 2, title: 'ETH 24h volume spike', time: '14m ago', type: 'info' },
  { id: 3, title: 'SOL added to watchlist', time: '2h ago', type: 'info' },
]

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-white/5 transition-all active:scale-[0.96]"
      >
        <Bell className="h-4 w-4" />
        <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-[#050816]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute right-0 top-12 w-80 rounded-3xl glass border border-white/10 p-1 shadow-premium z-50"
          >
            <div className="px-4 py-3 text-sm font-medium border-b border-white/10">Notifications</div>
            
            <div className="py-1">
              {notifications.map((n) => (
                <div key={n.id} className="flex gap-3 px-4 py-[13px] hover:bg-white/5 rounded-2xl cursor-pointer">
                  <div className="mt-0.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-[11px] text-muted">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-4 py-3 text-center text-xs text-muted border-t border-white/10">
              View all activity
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}