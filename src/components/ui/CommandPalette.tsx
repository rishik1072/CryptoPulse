import { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, Wallet, Star, Settings, Home, BellRing, Sparkles, User, Newspaper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CommandItem {
  label: string
  icon: React.ElementType
  path: string
  shortcut?: string
}

const commands: CommandItem[] = [
  { label: 'Overview', icon: Home, path: '/' },
  { label: 'Markets', icon: TrendingUp, path: '/markets' },
  { label: 'Portfolio', icon: Wallet, path: '/portfolio' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'News Center', icon: Newspaper, path: '/news' },
  { label: 'Watchlist', icon: Star, path: '/watchlist' },
  { label: 'Alerts', icon: BellRing, path: '/alerts' },
  { label: 'Settings', icon: Settings, path: '/settings' },
  { label: 'Discover opportunities', icon: Sparkles, path: '/markets' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()

  const filtered = commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path)
      setOpen(false)
      setQuery('')
    },
    [navigate]
  )

  useEffect(() => {
    const togglePalette = () => {
      setOpen((current) => !current)
      setSelectedIndex(0)
      setQuery('')
    }

    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        togglePalette()
      }

      if (!open) return

      if (e.key === 'Escape') {
        setOpen(false)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        handleSelect(filtered[selectedIndex].path)
      }
    }

    const openHandler = () => {
      setOpen(true)
      setSelectedIndex(0)
      setQuery('')
    }

    document.addEventListener('keydown', down)
    window.addEventListener('open-command-palette', openHandler)
    return () => {
      document.removeEventListener('keydown', down)
      window.removeEventListener('open-command-palette', openHandler)
    }
  }, [filtered, open, selectedIndex, handleSelect])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="relative mx-4 w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-white/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-4">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages or actions..."
                className="flex-1 bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400"
              />
              <div className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ESC</div>
            </div>

            <div className="max-h-[320px] overflow-auto p-2">
              {filtered.length > 0 ? (
                filtered.map((cmd, index) => (
                  <motion.button
                    key={`${cmd.label}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 2, scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => handleSelect(cmd.path)}
                    className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-violet-50 text-violet-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <cmd.icon className="h-4 w-4" />
                    <span className="font-medium">{cmd.label}</span>
                    {cmd.shortcut && <span className="ml-auto text-[10px] text-slate-400">{cmd.shortcut}</span>}
                  </motion.button>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-slate-500">No results found</div>
              )}
            </div>

            <div className="flex justify-between border-t border-slate-200/80 px-5 py-3 text-[10px] text-slate-500">
              <div>
                Press <span className="font-mono">↑↓</span> to navigate
              </div>
              <div>Enter to select</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}