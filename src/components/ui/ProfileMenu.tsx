import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings as SettingsIcon, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

function LocalProfileMenu() {
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuthStore()

  const displayName = user?.name || 'Investor'
  const email = user?.email || 'Secure workspace'
  const avatarUrl = user?.avatarUrl

  if (!isAuthenticated) {
    return (
      <Link to="/sign-in" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#1E232E]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFB300] text-slate-950 font-bold shadow-sm">
          <User className="h-4 w-4 text-slate-950" />
        </div>
        <div className="hidden text-left md:block">
          <div className="text-xs font-semibold text-[#F0F4F8]">Sign in</div>
          <div className="-mt-0.5 text-[10px] text-[#94A3B8]">Institutional desk</div>
        </div>
      </Link>
    )
  }

  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'P'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFB300] font-semibold text-xs text-slate-950 border border-[#FFB300]/40 hover:ring-2 hover:ring-[#FFB300]/30 transition-colors cursor-pointer shadow-sm"
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
            className="absolute right-0 top-[48px] z-50 w-56 rounded-xl border border-border bg-surface py-1 shadow-2xl text-foreground"
          >
            <div className="border-b border-border px-3.5 py-2.5">
              <div className="font-semibold text-xs text-foreground truncate">{displayName}</div>
              <div className="text-[11px] text-muted truncate mt-0.5">{email}</div>
            </div>

            <div className="py-1">
              <Link to="/profile" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
                <User className="h-3.5 w-3.5 text-muted" /> Profile
              </Link>
              <Link to="/portfolio" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
                <CreditCard className="h-3.5 w-3.5 text-muted" /> Portfolio
              </Link>
              <Link to="/settings" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground">
                <SettingsIcon className="h-3.5 w-3.5 text-muted" /> Settings
              </Link>
            </div>

            <div className="mt-1 border-t border-[#262D38] pt-1">
              <button
                onClick={() => {
                  signOut()
                  window.location.assign('/sign-in')
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#FF5252] transition-colors hover:bg-[#FF5252]/10 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-[#FF5252]" /> Sign out
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
