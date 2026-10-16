import { useUIStore } from '@/store/useUIStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Menu, Search, Sparkles, Sun, Moon, WifiOff } from 'lucide-react'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { Link } from 'react-router-dom'
import { ShinyText } from '@/components/reactbits/ShinyText'
import { switchTheme } from '@/lib/theme'

export function Navbar() {
  const { toggleSidebar } = useUIStore()
  const { connectionStatus, lastUpdate } = useLivePriceStore()
  const { preferences } = useAuthStore()

  const isDark = preferences.theme === 'dark'

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('open-command-palette'))
  }

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    switchTheme(nextTheme)
  }

  const isLive = connectionStatus === 'connected' && lastUpdate !== null

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[var(--sidebar-header)]/95 backdrop-blur-md">
      <div className="flex h-14 sm:h-15 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-elevated hover:text-foreground lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[var(--accent-contrast)] shadow-sm group-hover:bg-accent-hover transition-colors">
              <Sparkles className="h-4 w-4 text-[var(--accent-contrast)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-foreground font-heading">
                  CryptoPulse
                </span>
                <span className="rounded bg-accent/10 border border-accent/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                  <ShinyText text="PRO" speed={4} className="text-accent font-bold" />
                </span>
              </div>
              <div className="text-[10px] text-muted leading-tight">Market Intelligence</div>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar with Ctrl K shortcut */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <button
            type="button"
            onClick={openCommandPalette}
            className="group relative flex w-full items-center rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs text-muted transition-all hover:border-accent/50 hover:bg-surface-elevated/90 hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5 text-muted group-hover:text-accent transition-colors mr-2 shrink-0" />
            <span className="truncate text-left text-xs text-muted group-hover:text-foreground">
              Search coins, symbols, or categories...
            </span>
            <div className="ml-auto flex items-center rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted border border-border">
              Ctrl K
            </div>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live Feed Status Pill */}
          {isLive ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-md border border-positive/30 bg-positive/10 px-2.5 py-1 text-xs font-semibold text-positive"
              title="Streaming live ticks from Binance WebSocket"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
              <span>Live Feed</span>
            </div>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium text-muted"
              title={connectionStatus === 'connecting' ? 'Connecting to Binance WebSocket…' : 'WebSocket feed disconnected'}
            >
              <WifiOff className="h-3 w-3" />
              <span>{connectionStatus === 'connecting' ? 'Connecting…' : 'Offline'}</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-accent" /> : <Moon className="h-3.5 w-3.5 text-accent" />}
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