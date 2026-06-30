import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  Star, 
  Settings 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/portfolio', label: 'Portfolio', icon: Wallet },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/alerts', label: 'Alerts', icon: Star },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { sidebarOpen } = useUIStore()

  return (
    <motion.aside
      animate={sidebarOpen ? 'open' : 'closed'}
      variants={{
        open: { x: 0 },
        closed: { x: '-100%' },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="fixed top-16 z-40 h-[calc(100vh-4rem)] w-72 border-r border-white/10 bg-[#0a0f24]/95 backdrop-blur-xl lg:sticky lg:translate-x-0"
    >
      <div className="flex h-full flex-col p-4">
        <nav className="flex-1 space-y-1 pt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 pt-4 text-[10px] uppercase tracking-[0.24em] text-slate-500">
          v1.0.0 • Premium Edition
        </div>
      </div>
    </motion.aside>
  )
}