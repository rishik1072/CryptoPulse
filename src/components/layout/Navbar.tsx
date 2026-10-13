import { useUIStore } from '@/store/useUIStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { Menu, Search, WifiOff } from 'lucide-react'

export function Navbar() {
  const { toggleSidebar } = useUIStore()
  const { connectionStatus, lastUpdate } = useLivePriceStore()

  const openCommandPalette = () => {
    window.dispatchEvent(new Event('open-command-palette'))
  }

  const isLive = connectionStatus === 'connected' && lastUpdate !== null

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-2xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-semibold text-white shadow-[0_12px_24px_-15px_rgba(109,40,217,0.65)]">
              CP
            </div>
            <div>
              <span className="text-[19px] font-semibold tracking-[-0.02em] text-slate-900">CryptoPulse</span>
              <div className="text-xs text-slate-500">Premium investing</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLive ? (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600"
              title="Streaming live ticks from Binance WebSocket"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Feed</span>
            </div>
          ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 animate-pulse"
              title="Connecting to Binance WebSocket..."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"
              title="Binance WebSocket is currently offline"
            >
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </div>
          )}

          <button
            onClick={openCommandPalette}
            className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-[9px] text-sm text-slate-500 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-slate-700 active:scale-[0.985] md:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search pages...</span>
            <div className="ml-2 flex items-center gap-px text-[10px]">
              <div className="rounded bg-white px-1.5 py-px font-mono text-slate-600">⌘</div>
              <div className="rounded bg-white px-1.5 py-px font-mono text-slate-600">K</div>
            </div>
          </button>
        </div>
      </div>
    </nav>
  )
}