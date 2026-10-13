import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings as SettingsIcon, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

function LocalProfileMenu() {
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated, signOut, preferences } = useAuthStore()
  const isDark = preferences.theme === 'dark'

  const displayName = user?.name || 'Investor'
  const email = user?.email || 'Secure workspace'
  const avatarUrl = user?.avatarUrl

  if (!isAuthenticated) {
    return (
      <Link to="/sign-in" className={`flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-all ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-white">
          <User className="h-4 w-4" />
        </div>
        <div className="hidden text-left md:block">
          <div className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Sign in</div>
          <div className={`-mt-0.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Secure access</div>
        </div>
      </Link>
    )
  }

  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'P'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 font-bold text-sm text-white shadow-md shadow-violet-500/20 ring-2 ring-violet-500/30 hover:scale-105 transition-all"
        aria-label="User account menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className={`absolute right-0 top-[54px] z-50 w-60 rounded-3xl border py-1 shadow-xl backdrop-blur-xl ${isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'}`}
          >
            <div className={`border-b px-4 py-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{displayName}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{email}</div>
            </div>

            <div className="py-1">
              <Link to="/profile" className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <User className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /> Profile
              </Link>
              <Link to="/portfolio" className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <CreditCard className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /> Portfolio
              </Link>
              <Link to="/settings" className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <SettingsIcon className={`h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} /> Settings
              </Link>
            </div>

            <div className={`mt-1 border-t pt-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => {
                  signOut()
                  window.location.assign('/sign-in')
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-500 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProfileMenu() {
  return <LocalProfileMenu />
}
