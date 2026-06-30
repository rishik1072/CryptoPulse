import { useUIStore } from '@/store/useUIStore'
import { Menu, Search } from 'lucide-react'
import { NotificationDropdown } from '@/components/ui/NotificationDropdown'
import { ProfileMenu } from '@/components/ui/ProfileMenu'

export function Navbar() {
  const { toggleSidebar } = useUIStore()

  const openCommandPalette = () => {
    // We'll trigger the command palette via a custom event
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#060b18]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-2xl p-2 transition-colors hover:bg-white/5 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary shadow-lg shadow-violet-950/40" />
            <div>
              <span className="text-[19px] font-semibold tracking-[-0.02em] text-white">CryptoPulse</span>
            </div>
          </div>
        </div>

        <button
          onClick={openCommandPalette}
          className="hidden items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-[9px] text-sm text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-[0.985] md:flex"
        >
          <Search className="h-4 w-4" />
          <span>Search pages...</span>
          <div className="ml-2 flex items-center gap-px text-[10px]">
            <div className="rounded bg-white/10 px-1.5 py-px font-mono">⌘</div>
            <div className="rounded bg-white/10 px-1.5 py-px font-mono">K</div>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <NotificationDropdown />
          <ProfileMenu />
        </div>
      </div>
    </nav>
  )
}