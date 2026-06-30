import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings as SettingsIcon, CreditCard } from 'lucide-react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

function ClerkProfileMenu() {
  const [open, setOpen] = useState(false)
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5">
        <div className="h-8 w-8 rounded-xl bg-white/10" />
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium text-white/80">Loading…</div>
        </div>
      </div>
    )
  }

  const displayName = user?.fullName || user?.firstName || 'Crypto Trader'
  const email = user?.primaryEmailAddress?.emailAddress || 'Signed in'
  const avatarUrl = user?.imageUrl

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-all hover:bg-white/5 active:scale-[0.985]"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary ring-1 ring-white/20">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
        </div>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium">{displayName}</div>
          <div className="-mt-0.5 text-[10px] text-muted">{typeof user?.publicMetadata?.plan === 'string' ? user.publicMetadata.plan : 'Pro Member'}</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 top-[52px] z-50 w-60 rounded-3xl border border-white/10 bg-[#060b18]/95 py-1 shadow-premium backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-muted">{email}</div>
            </div>

            <div className="py-1">
              <Link to="/settings" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5">
                <User className="h-4 w-4 text-muted" /> Profile
              </Link>
              <Link to="/settings" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5">
                <CreditCard className="h-4 w-4 text-muted" /> Billing
              </Link>
              <Link to="/settings" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5">
                <SettingsIcon className="h-4 w-4 text-muted" /> Preferences
              </Link>
            </div>

            <div className="mt-1 border-t border-white/10 pt-1">
              <button
                onClick={() => void signOut(() => window.location.assign(import.meta.env.VITE_CLERK_AFTER_SIGN_OUT_URL || '/sign-in'))}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-white/5"
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

function FallbackProfileMenu() {
  return (
    <Link to="/sign-in" className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-all hover:bg-white/5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary ring-1 ring-white/20">
        <User className="h-4 w-4" />
      </div>
      <div className="hidden text-left md:block">
        <div className="text-sm font-medium">Sign in</div>
        <div className="-mt-0.5 text-[10px] text-muted">Secure access</div>
      </div>
    </Link>
  )
}

export function ProfileMenu() {
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  const clerkEnabled = Boolean(
    clerkPublishableKey &&
      clerkPublishableKey !== 'your_clerk_publishable_key_here' &&
      clerkPublishableKey.startsWith('pk_live_')
  )

  if (!clerkEnabled) {
    return <FallbackProfileMenu />
  }

  return <ClerkProfileMenu />
}