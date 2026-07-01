import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/clerk-react'
import {
  BellRing,
  ChevronRight,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sparkles,
  Star,
  SunMedium,
  TrendingUp,
  Wallet,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/useUIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileMenu } from '@/components/ui/ProfileMenu'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, hint: 'Daily snapshot' },
  { to: '/markets', label: 'Markets', icon: TrendingUp, hint: 'Discover movers' },
  { to: '/portfolio', label: 'Portfolio', icon: Wallet, hint: 'Balance view' },
  { to: '/profile', label: 'Profile', icon: Sparkles, hint: 'Account view' },
  { to: '/watchlist', label: 'Watchlist', icon: Star, hint: 'Your ideas' },
  { to: '/alerts', label: 'Alerts', icon: BellRing, hint: 'Signal alerts' },
  { to: '/settings', label: 'Settings', icon: Settings, hint: 'Preferences' },
]

const workspaces = [
  { id: 'personal' as const, label: 'Personal', subtitle: 'Your main desk', short: 'P' },
  { id: 'research' as const, label: 'Research', subtitle: 'Idea lab', short: 'R' },
  { id: 'institutional' as const, label: 'Institutional', subtitle: 'Team view', short: 'I' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100000 ? 0 : 2,
  }).format(value)
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const clerkEnabled = Boolean(
  clerkPublishableKey &&
    clerkPublishableKey !== 'your_clerk_publishable_key_here' &&
    clerkPublishableKey.startsWith('pk_live_')
)

interface SidebarInnerProps {
  profileName: string
  profileEmail: string
  avatarUrl?: string
}

function SidebarInner({ profileName, profileEmail, avatarUrl }: SidebarInnerProps) {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUIStore()
  const { preferences, updatePreferences } = useAuthStore()
  const { holdings } = usePortfolioStore()
  const { prices } = useLivePriceStore()
  const [workspace, setWorkspace] = useState<'personal' | 'research' | 'institutional'>('personal')
  const isDark = preferences.theme === 'dark'

  const totalBalance = useMemo(() => {
    return holdings.reduce((sum, holding) => {
      const price = prices[holding.symbol]?.price ?? holding.avgBuyPrice
      return sum + holding.quantity * price
    }, 0)
  }, [holdings, prices])

  const initials = profileName
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('open-command-palette'))
    if (window.innerWidth < 1024) {
      closeSidebar()
    }
  }

  const toggleTheme = () => {
    updatePreferences({ theme: isDark ? 'light' : 'dark' })
  }

  const activeWorkspace = workspaces.find((item) => item.id === workspace) ?? workspaces[0]

  return (
    <motion.aside
      animate={sidebarOpen ? { x: 0, width: 288 } : { x: 0, width: 88 }}
      transition={{ type: 'spring', stiffness: 280, damping: 34 }}
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r backdrop-blur-2xl lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isDark ? 'border-slate-800/80 bg-slate-950/90 text-slate-100' : 'border-slate-200/80 bg-white/90 text-slate-900'
      )}
    >
      <div className="flex h-full flex-col p-3 sm:p-4">
        <div className={cn('relative overflow-hidden rounded-[24px] border p-3', isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/90 shadow-sm')}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(109,40,217,0.18),_transparent_35%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Workspace</div>
                <div className="mt-2 text-sm font-semibold">{activeWorkspace.label}</div>
                <div className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{profileName}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.04, rotate: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={toggleSidebar}
                className={`rounded-2xl p-2 transition-all ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'}`}
                aria-label="Collapse sidebar"
              >
                <ArrowLeft className="h-4 w-4" />
              </motion.button>
            </div>

            <div className={`mt-4 flex items-center justify-between rounded-[18px] border px-3 py-3 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white/80'}`}>
              <div>
                <div className={`text-[10px] uppercase tracking-[0.25em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Balance</div>
                <div className="mt-1 text-sm font-semibold">{formatCurrency(totalBalance)}</div>
              </div>
              <div className="rounded-2xl bg-violet-500/15 p-2 text-violet-600">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-4 rounded-[22px] border p-2 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80'}`}>
          <div className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Workspace switcher</div>
          <div className="space-y-1">
            {workspaces.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ x: 2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setWorkspace(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-all',
                  workspace === item.id
                    ? isDark
                      ? 'bg-violet-500/10 text-violet-300'
                      : 'bg-violet-50 text-violet-700'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800/80'
                      : 'text-slate-600 hover:bg-white'
                )}
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-semibold', workspace === item.id ? 'bg-violet-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
                  {item.short}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  <div className={`truncate text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.subtitle}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="block">
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 transition-all',
                    isActive
                      ? isDark
                        ? 'bg-violet-500/12 text-violet-300'
                        : 'bg-violet-50 text-violet-700'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-2xl', isActive ? 'bg-violet-600 text-white shadow-lg' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600')}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <AnimatePresence mode="wait">
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="min-w-0"
                      >
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.hint}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-3 space-y-2">
          <motion.button
            whileHover={{ x: 2, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={openCommandPalette}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all',
              isDark ? 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            <Search className="h-4 w-4" />
            {sidebarOpen && <span className="flex-1 text-left">Search</span>}
            {sidebarOpen && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">⌘K</span>}
          </motion.button>

          <motion.button
            whileHover={{ x: 2, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={toggleTheme}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all',
              isDark ? 'bg-slate-900/80 text-slate-200 hover:bg-slate-800/80' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {sidebarOpen && <span className="flex-1 text-left">{isDark ? 'Light mode' : 'Dark mode'}</span>}
          </motion.button>
        </div>

        <div className={`mt-3 rounded-[20px] border p-3 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white/80'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-semibold text-white">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{profileName}</div>
                <div className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{profileEmail}</div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <div className="mt-3 flex items-center justify-between text-sm text-violet-600">
              <span className="font-medium">Account</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <NotificationDropdown />
          <ProfileMenu />
        </div>
      </div>
    </motion.aside>
  )
}

function SidebarClerk() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const profileName = isLoaded ? clerkUser?.fullName || clerkUser?.firstName || (isSignedIn ? 'Investor' : 'Guest') : 'Loading…'
  const profileEmail = isLoaded ? clerkUser?.primaryEmailAddress?.emailAddress || (isSignedIn ? 'Verified account' : 'Sign in to sync') : 'Checking session…'
  const avatarUrl = clerkUser?.imageUrl

  return <SidebarInner profileName={profileName} profileEmail={profileEmail} avatarUrl={avatarUrl} />
}

function SidebarLocal() {
  const { user } = useAuthStore()
  const profileName = user?.name || 'Guest'
  const profileEmail = user?.email || 'Sign in to sync'
  const avatarUrl = user?.avatarUrl

  return <SidebarInner profileName={profileName} profileEmail={profileEmail} avatarUrl={avatarUrl} />
}

export function Sidebar() {
  if (clerkEnabled) {
    return <SidebarClerk />
  }
  return <SidebarLocal />
}