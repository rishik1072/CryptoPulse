import { useState, useRef } from 'react'
import {
  Download,
  Globe2,
  Lock,
  MonitorSmartphone,
  MoonStar,
  Trash2,
  UserCircle2,
  Wallet2,
  Camera,
  Languages,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=trader',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=groww',
  'https://api.dicebear.com/7.x/identicon/svg?seed=bitcoin',
  'https://api.dicebear.com/7.x/identicon/svg?seed=ethereum',
  'https://api.dicebear.com/7.x/bottts/svg?seed=cryptopulse'
]

type SettingsTab = 'profile' | 'preferences' | 'security' | 'danger'



export default function Settings() {
  const {
    user,
    preferences,
    updatePreferences,
    updateProfile,
    changePassword,
    toggleTwoFactor,
    setConnectedGoogle,
    signOut,
    deleteAccount,
    refreshSession,
    clearSessions,
    sessions,
    hasTwoFactor,
    connectedGoogle,
    error,
  } = useAuthStore()

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile forms
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  // Password forms
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleProfileSave = () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please provide a valid email')
      return
    }
    updateProfile({ name: displayName, email, phone })
    toast.success('Profile details saved successfully!')
  }

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    const ok = await changePassword(currentPassword, newPassword)
    if (ok) {
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      toast.error(error || 'Password update failed')
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be smaller than 2MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        updateProfile({ avatarUrl: reader.result as string })
        toast.success('Profile photo updated successfully!')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExportData = () => {
    const payload = {
      user,
      preferences,
      sessions,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cryptopulse-data-${user?.id || 'export'}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Your account data has been successfully exported.')
  }

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'WARNING: This will permanently delete your account, portfolio holdings, watchlist, and active price alerts. This action CANNOT be undone. Are you sure you want to proceed?'
    )
    if (!confirmDelete) return

    try {
      await deleteAccount()
      const currentError = useAuthStore.getState().error
      if (currentError) {
        toast.error(currentError)
      } else {
        toast.success('Your account has been deleted.')
        window.location.assign('/sign-in')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account'
      toast.error(msg)
    }
  }

  const handleNotificationToggle = (type: 'browser' | 'email' | 'price' | 'global') => {
    if (type === 'browser') {
      const nextVal = !preferences.browserNotifications
      if (nextVal && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            updatePreferences({ browserNotifications: true })
            toast.success('Browser notifications enabled!')
          } else {
            toast.error('Permission denied for browser notifications')
          }
        })
      } else {
        updatePreferences({ browserNotifications: nextVal })
        toast.success(`Browser notifications ${nextVal ? 'enabled' : 'disabled'}`)
      }
    } else if (type === 'email') {
      const nextVal = !preferences.emailNotifications
      updatePreferences({ emailNotifications: nextVal })
      toast.success(`Email updates ${nextVal ? 'enabled' : 'disabled'}`)
    } else if (type === 'price') {
      const nextVal = !preferences.priceAlerts
      updatePreferences({ priceAlerts: nextVal })
      toast.success(`Price alerts ${nextVal ? 'enabled' : 'disabled'}`)
    } else if (type === 'global') {
      const nextVal = !preferences.notifications
      updatePreferences({ notifications: nextVal })
      toast.success(`System notifications ${nextVal ? 'enabled' : 'disabled'}`)
    }
  }

  const handlePresetSelect = (url: string) => {
    updateProfile({ avatarUrl: url })
    toast.success('Avatar updated successfully!')
  }

  const handleConnectGoogle = () => {
    const nextVal = !connectedGoogle
    setConnectedGoogle(nextVal)
    toast.success(nextVal ? 'Google Account Connected!' : 'Google Account Unlinked')
  }

  const handleToggle2FA = () => {
    const nextVal = !hasTwoFactor
    toggleTwoFactor(nextVal)
    toast.success(nextVal ? 'Two-Factor Authentication activated' : 'Two-Factor Authentication deactivated')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage account information, customization, security, and alerts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              signOut()
              window.location.assign('/sign-in')
            }}
            className="rounded-2xl bg-rose-600/10 px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-600/20 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Settings Left Navigation Sidebar */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 border-b border-slate-200/80 dark:border-slate-800/80 md:border-b-0 pb-3 md:pb-0 scrollbar-none">
          {[
            { id: 'profile', label: 'User Profile', icon: UserCircle2 },
            { id: 'preferences', label: 'Preferences', icon: MoonStar },
            { id: 'security', label: 'Security & Sessions', icon: Lock },
            { id: 'danger', label: 'Privacy & Danger', icon: Trash2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              }`}
            >
              <tab.icon className="h-4.5 w-4.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <GlassCard className="card-sheen space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Profile Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customize how you look on the platform.</p>
              </div>

              {/* Avatar Photo Section */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center p-4 rounded-3xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="relative group self-start sm:self-auto">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] bg-gradient-to-br from-violet-600 to-sky-500 text-2xl font-semibold text-white shadow-md ring-2 ring-white/10">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover animate-fade-in" />
                    ) : (
                      (displayName || user?.name || 'CP').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-[26px] bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="space-y-3 flex-1">
                  <div className="text-sm font-semibold">Select a template avatar</div>
                  <div className="flex flex-wrap gap-2.5">
                    {AVATAR_PRESETS.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => handlePresetSelect(url)}
                        className={`h-10 w-10 overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.05] cursor-pointer ${
                          user?.avatarUrl === url
                            ? 'border-violet-600 scale-[1.05] ring-2 ring-violet-500/20'
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <img src={url} alt="Preset" className="h-full w-full object-cover bg-slate-100 dark:bg-slate-800" />
                      </button>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-300 hover:border-violet-500 text-slate-500 transition-colors bg-white dark:bg-slate-900 dark:border-slate-800 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-normal text-slate-850 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 bg-white dark:bg-slate-900"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Email Address
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-normal text-slate-850 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 bg-white dark:bg-slate-900"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-slate-500 uppercase tracking-widest sm:col-span-2">
                  Phone Number
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-normal text-slate-850 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 bg-white dark:bg-slate-900"
                    placeholder="Enter phone number"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleProfileSave}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white dark:bg-white dark:text-slate-950 transition hover:scale-[1.01] cursor-pointer"
                >
                  Save Profile Details
                </button>
                <button
                  onClick={() => {
                    setDisplayName(user?.name ?? '')
                    setEmail(user?.email ?? '')
                    setPhone(user?.phone ?? '')
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-700 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-355 transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </GlassCard>
          )}

          {activeTab === 'preferences' && (
            <GlassCard className="card-sheen space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Platform Customization</h3>
                <p className="text-xs text-slate-500 mt-0.5">Adapt CryptoPulse settings to suit your local workflow.</p>
              </div>

              {/* Local preferences selector options */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <MoonStar className="h-4.5 w-4.5 text-violet-600" />
                    <span>Display Mode</span>
                  </div>
                  <select
                    value={preferences.theme}
                    onChange={(event) => updatePreferences({ theme: event.target.value as 'dark' | 'light' })}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Languages className="h-4.5 w-4.5 text-violet-600" />
                    <span>Language</span>
                  </div>
                  <select
                    value={preferences.language}
                    onChange={(event) => updatePreferences({ language: event.target.value })}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="de">Deutsch (DE)</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Wallet2 className="h-4.5 w-4.5 text-violet-600" />
                    <span>Base Currency</span>
                  </div>
                  <select
                    value={preferences.currency}
                    onChange={(event) => updatePreferences({ currency: event.target.value })}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="h-4.5 w-4.5 text-violet-600" />
                    <span>Timezone</span>
                  </div>
                  <select
                    value={preferences.timezone}
                    onChange={(event) => updatePreferences({ timezone: event.target.value })}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="UTC">UTC (GMT)</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="Europe/London">London (GMT+1)</option>
                    <option value="Asia/Kolkata">Mumbai (IST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </label>
              </div>

              {/* Notification switches */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Notification Preferences</div>
                
                <div className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Global system notices</div>
                    <div className="text-xs text-slate-400">Master switch for all system notices.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handleNotificationToggle('global')}
                    className="accent-violet-600 h-4.5 w-4.5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Browser Notifications</div>
                    <div className="text-xs text-slate-400">Receive real-time desktop popups when alerts fire.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.browserNotifications}
                    onChange={() => handleNotificationToggle('browser')}
                    className="accent-violet-600 h-4.5 w-4.5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Email alerts</div>
                    <div className="text-xs text-slate-400">Send summary logs of transactions and alerts to {user?.email}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handleNotificationToggle('email')}
                    className="accent-violet-600 h-4.5 w-4.5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Price Alerts evaluation</div>
                    <div className="text-xs text-slate-400">Run active price tracking checking scripts in background.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.priceAlerts}
                    onChange={() => handleNotificationToggle('price')}
                    className="accent-violet-600 h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password update Card */}
              <GlassCard className="card-sheen space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Update Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ensure your account is protected with a unique password.</p>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <label className="space-y-1.5 text-xs text-slate-500">
                    Current Password
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs text-slate-500">
                    New Password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs text-slate-500">
                    Confirm New Password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="input w-full mt-1 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </label>
                </div>
                <button
                  onClick={handlePasswordSave}
                  className="rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2.5 text-xs font-semibold hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  Save New Password
                </button>
              </GlassCard>

              {/* Two Factor and Google Integrations */}
              <GlassCard className="card-sheen space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Security Auditing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Connect additional integrations to log in safely.</p>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</div>
                      <div className="text-xs text-slate-400 mt-0.5">Mandate a secure verification step when signing in.</div>
                    </div>
                    <button
                      onClick={handleToggle2FA}
                      className={`rounded-full px-4 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                        hasTwoFactor
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {hasTwoFactor ? 'Activated' : 'Activate'}
                    </button>
                  </div>

                  <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800/50 pt-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Connected Google Account</div>
                      <div className="text-xs text-slate-400 mt-0.5">Link your account to authenticate via Google Sign In instantly.</div>
                    </div>
                    <button
                      onClick={handleConnectGoogle}
                      className={`rounded-full px-4 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                        connectedGoogle
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {connectedGoogle ? 'Connected' : 'Link Account'}
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Active Sessions list */}
              <GlassCard className="card-sheen space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Active Device Sessions</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Verify and track which devices hold authenticated session tokens.</p>
                  </div>
                  <button
                    onClick={refreshSession}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Refresh List
                  </button>
                </div>

                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div className="flex items-start gap-3">
                        <MonitorSmartphone className="h-5 w-5 mt-0.5 text-violet-600" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{session.device}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{session.location} • Last active {session.lastSeen}</div>
                        </div>
                      </div>
                      {session.current ? (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Active Now
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Authenticated</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={clearSessions}
                  className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Revoke Other Sessions
                </button>
              </GlassCard>
            </div>
          )}

          {activeTab === 'danger' && (
            <GlassCard className="card-sheen space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Privacy & Account Controls</h3>
                <p className="text-xs text-slate-500 mt-0.5">Control data visibility and safety compliance options.</p>
              </div>

              {/* Privacy option */}
              <div className="flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Privacy Cloak Mode</div>
                  <div className="text-xs text-slate-400 mt-0.5">Hide balance figures and coin amounts on sidebar or dashboard summaries.</div>
                </div>
                <button
                  onClick={() => updatePreferences({ privacyMode: !preferences.privacyMode })}
                  className={`rounded-full px-4 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                    preferences.privacyMode
                      ? 'border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {preferences.privacyMode ? 'Active' : 'Activate'}
                </button>
              </div>

              {/* Data controls */}
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Account Actions</div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3.5 text-xs font-semibold text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-violet-600" />
                    Export Local Data (.JSON)
                  </button>

                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 dark:border-rose-950/20 dark:bg-rose-500/10 px-4 py-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}