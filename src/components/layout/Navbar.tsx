import { useUIStore } from '@/store/useUIStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Menu, Search, Sparkles, Sun, Moon, WifiOff } from 'lucide-react'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { Link } from 'react-router-dom'

export function Navbar() {
  const { toggleSidebar } = useUIStore()
  const { connectionStatus, lastUpdate } = useLivePriceStore()
  const { preferences, updatePreferences, user } = useAuthStore()

  const isDark = preferences.theme === 'dark'

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('open-command-palette'))
  }

  const toggleTheme = () => {
    updatePreferences({ theme: isDark ? 'light' : 'dark' })
  }

  const isLive = connectionStatus === 'connected' && lastUpdate !== null

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070913]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  CryptoPulse
                </span>
                <span className="rounded bg-violet-600/30 border border-violet-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Premium investing</div>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar with Ctrl K shortcut */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <button
            type="button"
            onClick={openCommandPalette}
            className="group relative flex w-full items-center rounded-full border border-white/[0.08] bg-[#0E1326] px-4 py-2 text-sm text-slate-400 transition-all hover:border-violet-500/40 hover:bg-[#121933] hover:text-slate-200"
          >
            <Search className="h-4 w-4 text-slate-400 group-hover:text-violet-400 transition-colors mr-2.5 shrink-0" />
            <span className="truncate text-left text-xs sm:text-sm text-slate-400">
              Search coins, symbols, or categories...
            </span>
            <div className="ml-auto flex items-center rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-mono text-slate-400 border border-white/5">
              Ctrl K
            </div>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Live Feed Status Pill */}
          {isLive ? (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-400"
              title="Streaming live ticks from Binance WebSocket"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Feed</span>
            </div>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-400"
              title="Connecting to Binance WebSocket..."
            >
              <WifiOff className="h-3 w-3" />
              <span>Live Feed</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#0E1326] text-slate-300 hover:text-white hover:bg-[#151D36] transition"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* Profile Menu / Avatar */}
          <ProfileMenu />
        </div>
      </div>
    </nav>
  )
}