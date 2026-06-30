import { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, Wallet, Star, Settings, Home } from 'lucide-react'
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
  { label: 'Watchlist', icon: Star, path: '/watchlist' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = useCallback((path: string) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }, [navigate])

  // Keyboard shortcut + navigation
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
        setSelectedIndex(0)
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
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [filtered, open, selectedIndex, handleSelect])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="relative w-full max-w-[560px] mx-4 overflow-hidden rounded-3xl glass border border-white/10 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages or actions..."
                className="flex-1 bg-transparent text-lg placeholder:text-muted outline-none"
              />
              <div className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded">ESC</div>
            </div>

            <div className="max-h-[300px] overflow-auto p-2">
              {filtered.length > 0 ? (
                filtered.map((cmd, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(cmd.path)}
                    className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <cmd.icon className="h-4 w-4 text-muted group-hover:text-white" />
                    <span className="font-medium">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="ml-auto text-[10px] text-muted">{cmd.shortcut}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-muted">
                  No results found
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-3 text-[10px] text-muted flex justify-between">
              <div>Press <span className="font-mono">↑↓</span> to navigate</div>
              <div>Enter to select</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}