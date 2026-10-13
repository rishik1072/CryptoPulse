import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BellRing,
  Crown,
  LayoutGrid,
  Newspaper,
  Star,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'

const navItems = [
  { to: '/', label: 'Dashboard', subtitle: 'Market overview', icon: LayoutGrid },
  { to: '/markets', label: 'Markets', subtitle: 'Browse & analyze', icon: TrendingUp },
  { to: '/portfolio', label: 'Portfolio', subtitle: 'Track your assets', icon: Wallet },
  { to: '/watchlist', label: 'Watchlist', subtitle: 'Your favorite coins', icon: Star },
  { to: '/alerts', label: 'Alerts', subtitle: 'Price notifications', icon: BellRing },
  { to: '/news', label: 'News', subtitle: 'Latest updates', icon: Newspaper },
  { to: '/profile', label: 'Profile', subtitle: 'Account settings', icon: User },
]

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useUIStore()

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      closeSidebar()
    }
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 pt-16 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:pt-0',
        'border-r border-white/[0.06] bg-[#070913] backdrop-blur-2xl transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col justify-between p-4 overflow-y-auto">
        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                end={item.to === '/'}
                className="block"
              >
                {({ isActive }) => (
                  <motion.div
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-3.5 rounded-2xl px-3.5 py-3 transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-white/[0.04] text-slate-400'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold tracking-tight leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={cn(
                          'text-xs mt-0.5 truncate',
                          isActive ? 'text-violet-100/80' : 'text-slate-500'
                        )}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </motion.div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom "Upgrade to Pro" Card */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0E1326] p-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <h4 className="text-sm font-semibold text-white">Upgrade to Pro</h4>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Get advanced insights, real-time alerts, and more.
          </p>
          <button
            type="button"
            className="mt-3.5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:opacity-95 transition-opacity"
          >
            Learn More
          </button>
        </div>
      </div>
    </aside>
  )
}
