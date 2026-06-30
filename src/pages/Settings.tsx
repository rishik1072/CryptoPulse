import { useClerk, useUser } from '@clerk/clerk-react'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'

function ClerkSettingsView() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { preferences, updatePreferences } = useAuthStore()

  if (!isLoaded) {
    return <div className="mx-auto max-w-3xl text-sm text-muted">Loading your account…</div>
  }

  const displayName = user?.fullName || user?.firstName || 'Crypto Trader'
  const email = user?.primaryEmailAddress?.emailAddress || 'Signed in'
  const avatarUrl = user?.imageUrl

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px]">Settings</h1>
        <p className="mt-1 text-muted">Manage your account and preferences</p>
      </div>

      <GlassCard>
        <div className="mb-6 font-medium">Profile</div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary">
              {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" alt={displayName} /> : <span className="text-lg font-semibold">{displayName[0]}</span>}
            </div>
            <div>
              <div className="text-xl font-medium">{displayName}</div>
              <div className="text-muted">{email}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-6 font-medium">Preferences</div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 text-sm text-muted">Currency</div>
            <select
              value={preferences.currency}
              onChange={(e) => updatePreferences({ currency: e.target.value })}
              className="input w-full max-w-xs"
            >
              <option value="USD">USD — United States Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="BTC">BTC — Bitcoin</option>
            </select>
          </div>

          <div>
            <div className="mb-2 text-sm text-muted">Notifications</div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => updatePreferences({ notifications: e.target.checked })}
                className="accent-primary"
              />
              <span>Enable price alerts and notifications</span>
            </label>
          </div>
        </div>
      </GlassCard>

      <button
        onClick={() => void signOut(() => window.location.assign(import.meta.env.VITE_CLERK_AFTER_SIGN_OUT_URL || '/sign-in'))}
        className="text-sm text-danger hover:underline"
      >
        Sign out of CryptoPulse
      </button>
    </div>
  )
}

function FallbackSettingsView() {
  const { preferences, updatePreferences } = useAuthStore()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-[-1.5px]">Settings</h1>
        <p className="mt-1 text-muted">Preferences are saved locally until Clerk is configured.</p>
      </div>

      <GlassCard>
        <div className="mb-6 font-medium">Preferences</div>
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-sm text-muted">Currency</div>
            <select
              value={preferences.currency}
              onChange={(e) => updatePreferences({ currency: e.target.value })}
              className="input w-full max-w-xs"
            >
              <option value="USD">USD — United States Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="BTC">BTC — Bitcoin</option>
            </select>
          </div>

          <div>
            <div className="mb-2 text-sm text-muted">Notifications</div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => updatePreferences({ notifications: e.target.checked })}
                className="accent-primary"
              />
              <span>Enable price alerts and notifications</span>
            </label>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export default function Settings() {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <FallbackSettingsView />
  }

  return <ClerkSettingsView />
}