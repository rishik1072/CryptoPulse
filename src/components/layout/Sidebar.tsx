import { NavLink } from 'react-router-dom'
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
import { toast } from 'sonner'
import { motion, useReducedMotion } from 'framer-motion'
import { ShinyText } from '@/components/reactbits/ShinyText'

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

  const shouldReduceMotion = useReducedMotion()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-60 pt-14 sm:pt-15 lg:sticky lg:top-15 lg:h-[calc(100vh-3.75rem)] lg:pt-0',
        'border-r border-border bg-surface transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col justify-between p-3 overflow-y-auto">
        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                end={item.to === '/'}
                className="relative block"
              >
                {({ isActive }) => (
                  <div
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
                      isActive
                        ? 'text-foreground font-medium'
                        : 'text-muted hover:text-foreground hover:bg-surface-elevated/60'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-sidebar-pill"
                        className="absolute inset-0 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 350, damping: 30 }
                        }
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                        isActive
                          ? 'bg-[#FFB300]/20 text-[#FFB300]'
                          : 'bg-surface-elevated text-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className={cn(
                        'text-xs font-semibold tracking-tight leading-tight',
                        isActive ? 'text-foreground' : 'text-muted'
                      )}>
                        {item.label}
                      </div>
                      <div
                        className={cn(
                          'text-[10px] truncate',
                          isActive ? 'text-[#FFB300]/80' : 'text-muted'
                        )}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom "Upgrade to Pro" Card */}
        <div className="mt-4 rounded-xl border border-border bg-surface-elevated p-3 text-center">
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/25">
            <Crown className="h-4 w-4 fill-[#FFB300] text-[#FFB300]" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">
            <ShinyText text="CryptoPulse Pro" speed={5} className="font-semibold text-foreground" />
          </h4>
          <p className="mt-0.5 text-[11px] text-muted leading-snug">
            Real-time execution, alerts, and market signals.
          </p>
          <button
            type="button"
            onClick={() => toast.info('CryptoPulse Pro unlocks institutional feeds and unlimited alerts. All features are currently enabled in this preview session.')}
            className="mt-2.5 w-full rounded-lg bg-[#FFB300] hover:bg-[#FFA000] py-1.5 px-3 text-xs font-semibold text-slate-950 shadow-sm transition-colors cursor-pointer"
          >
            Learn More
          </button>
        </div>
      </div>
    </aside>
  )
}
