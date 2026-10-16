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
import { switchTheme } from '@/lib/theme'

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

  const handleProfileSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please provide a valid email')
      return
    }
    const toastId = toast.loading('Saving profile changes...')
    await updateProfile({ name: displayName, email, phone })
    const err = useAuthStore.getState().error
    if (err) {
      toast.error(err, { id: toastId })
    } else {
      toast.success('Profile details saved successfully!', { id: toastId })
    }
  }

  const handlePresetSelect = async (presetUrl: string) => {
    const toastId = toast.loading('Updating avatar...')
    await updateProfile({ avatarUrl: presetUrl })
    const err = useAuthStore.getState().error
    if (err) {
      toast.error(err, { id: toastId })
    } else {
      toast.success('Avatar updated successfully!', { id: toastId })
    }
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      toast.error('Invalid image format. Only JPEG, PNG, and WebP are supported.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be smaller than 2MB')
      return
    }

    const toastId = toast.loading('Uploading avatar to secure storage...')
    try {
      const publicUrl = await useAuthStore.getState().uploadAvatar(file)
      if (publicUrl) {
        toast.success('Profile photo updated successfully!', { id: toastId })
      } else {
        const authErr = useAuthStore.getState().error
        toast.error(authErr || 'Failed to upload avatar to Supabase Storage.', { id: toastId })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed'
      toast.error(msg, { id: toastId })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
    <div className="mx-auto max-w-[1720px] space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F4F8] sm:text-2xl">Account Settings</h1>
          <p className="mt-1 text-xs text-[#94A3B8]">Manage account information, display preferences, security, and alerts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              signOut()
              window.location.assign('/sign-in')
            }}
            className="rounded-lg border border-[#FF5252]/30 bg-[#FF5252]/10 px-3.5 py-1.5 text-xs font-medium text-[#FF5252] hover:bg-[#FF5252]/20 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Settings Left Navigation Sidebar */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 border-b border-[#262D38] md:border-b-0 pb-3 md:pb-0 scrollbar-none">
          {[
            { id: 'profile', label: 'User Profile', icon: UserCircle2 },
            { id: 'preferences', label: 'Preferences', icon: MoonStar },
            { id: 'security', label: 'Security & Sessions', icon: Lock },
            { id: 'danger', label: 'Privacy & Data', icon: Trash2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1E232E] text-[#FFB300] border border-[#FFB300]/40 font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:bg-[#1E232E] hover:text-[#F0F4F8] border border-transparent'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <GlassCard className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#F0F4F8]">Profile Details</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Customize your platform display identity.</p>
              </div>

              {/* Avatar Photo Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center p-4 rounded-xl border border-[#262D38] bg-[#0B0E14]">
                <div className="relative group self-start sm:self-auto">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#262D38] bg-[#FFB300]/15 text-xl font-bold text-[#FFB300]">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover animate-fade-in" />
                    ) : (
                      (displayName || user?.name || 'CP').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload profile photo"
                    className="hidden"
                  />
                </div>

                <div className="space-y-2.5 flex-1">
                  <div className="text-xs font-medium text-[#94A3B8]">Choose from preset avatars</div>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_PRESETS.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => handlePresetSelect(url)}
                        className={`h-9 w-9 overflow-hidden rounded-lg border transition-all cursor-pointer ${
                          user?.avatarUrl === url
                            ? 'border-[#FFB300] ring-2 ring-[#FFB300]/30'
                            : 'border-[#262D38] hover:border-[#FFB300]/40'
                        }`}
                      >
                        <img src={url} alt="Preset" className="h-full w-full object-cover bg-[#0B0E14]" />
                      </button>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-[#262D38] hover:border-[#FFB300] text-[#94A3B8] hover:text-[#FFB300] transition-colors bg-[#0B0E14] cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-[#F0F4F8]">
                  <span>Display Name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] bg-[#0B0E14]"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-[#F0F4F8]">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] bg-[#0B0E14]"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-[#F0F4F8] sm:col-span-2">
                  <span>Phone Number</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] bg-[#0B0E14]"
                    placeholder="Enter phone number"
                  />
                </label>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={handleProfileSave}
                  className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setDisplayName(user?.name ?? '')
                    setEmail(user?.email ?? '')
                    setPhone(user?.phone ?? '')
                  }}
                  className="rounded-lg border border-[#262D38] bg-[#1E232E] px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#262D38] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </GlassCard>
          )}

          {activeTab === 'preferences' && (
            <GlassCard className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Platform Preferences</h3>
                <p className="text-xs text-muted mt-0.5">Adapt CryptoPulse settings to your trading workflow.</p>
              </div>

              {/* Local preferences selector options */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs text-foreground">
                  <div className="flex items-center gap-2.5">
                    <MoonStar className="h-4 w-4 text-accent" />
                    <span className="font-medium">Display Mode</span>
                  </div>
                  <select
                    value={preferences.theme}
                    onChange={(event) => {
                      const next = event.target.value as 'dark' | 'light'
                      switchTheme(next)
                    }}
                    className="rounded-lg border border-border bg-surface text-foreground px-2.5 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs text-foreground">
                  <div className="flex items-center gap-2.5">
                    <Languages className="h-4 w-4 text-accent" />
                    <span className="font-medium">Language</span>
                  </div>
                  <select
                    value={preferences.language}
                    onChange={(event) => updatePreferences({ language: event.target.value })}
                    className="rounded-lg border border-border bg-surface text-foreground px-2.5 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="de">Deutsch (DE)</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs text-foreground">
                  <div className="flex items-center gap-2.5">
                    <Wallet2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">Base Currency</span>
                  </div>
                  <select
                    value={preferences.currency}
                    onChange={(event) => updatePreferences({ currency: event.target.value })}
                    className="rounded-lg border border-border bg-surface text-foreground px-2.5 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs text-foreground">
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">Timezone</span>
                  </div>
                  <select
                    value={preferences.timezone}
                    onChange={(event) => updatePreferences({ timezone: event.target.value })}
                    className="rounded-lg border border-border bg-surface text-foreground px-2.5 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
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
              <div className="space-y-2.5 pt-2">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Alerts & Notifications</div>
                
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs">
                  <div>
                    <div className="font-medium text-foreground">Global Notifications</div>
                    <div className="text-[11px] text-muted mt-0.5">Master toggle for system notices.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handleNotificationToggle('global')}
                    className="accent-accent h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs">
                  <div>
                    <div className="font-medium text-foreground">Browser Notifications</div>
                    <div className="text-[11px] text-muted mt-0.5">Receive desktop notifications when price threshold alerts trigger.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.browserNotifications}
                    onChange={() => handleNotificationToggle('browser')}
                    className="accent-accent h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs">
                  <div>
                    <div className="font-medium text-foreground">Email Summaries</div>
                    <div className="text-[11px] text-muted mt-0.5">Send portfolio performance digests to {user?.email}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handleNotificationToggle('email')}
                    className="accent-accent h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated p-3.5 text-xs">
                  <div>
                    <div className="font-medium text-foreground">Continuous Alert Evaluation</div>
                    <div className="text-[11px] text-muted mt-0.5">Evaluate active price conditions continuously in the background.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.priceAlerts}
                    onChange={() => handleNotificationToggle('price')}
                    className="accent-accent h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password update Card */}
              <GlassCard className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-[#F0F4F8]">Update Password</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Ensure your account is protected with a unique password.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5 text-xs text-[#F0F4F8]">
                    <span>Current Password</span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs bg-[#0B0E14] text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300]"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs text-[#F0F4F8]">
                    <span>New Password</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs bg-[#0B0E14] text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300]"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs text-[#F0F4F8]">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full mt-1 border border-[#262D38] rounded-lg px-3 py-2 text-xs bg-[#0B0E14] text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300]"
                    />
                  </label>
                </div>
                <button
                  onClick={handlePasswordSave}
                  className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] text-slate-950 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  Save New Password
                </button>
              </GlassCard>

              {/* Two Factor and Google Integrations */}
              <GlassCard className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-[#F0F4F8]">Security Credentials</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Multi-factor security and connected login options.</p>
                </div>

                <div className="rounded-xl border border-[#262D38] bg-[#0B0E14] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-xs text-[#F0F4F8]">Two-Factor Authentication (2FA)</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">Require verification code confirmation during login.</div>
                    </div>
                    <button
                      onClick={handleToggle2FA}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                        hasTwoFactor
                          ? 'border-[#00E676]/30 bg-[#00E676]/10 text-[#00E676]'
                          : 'border-[#262D38] bg-[#1E232E] text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8]'
                      }`}
                    >
                      {hasTwoFactor ? 'Activated' : 'Activate'}
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[#262D38] pt-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-xs text-[#F0F4F8]">Connected Google Account</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">Use Google Single Sign-On for faster authentication.</div>
                    </div>
                    <button
                      onClick={handleConnectGoogle}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                        connectedGoogle
                          ? 'border-[#00E676]/30 bg-[#00E676]/10 text-[#00E676]'
                          : 'border-[#262D38] bg-[#1E232E] text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8]'
                      }`}
                    >
                      {connectedGoogle ? 'Connected' : 'Link Account'}
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Active Sessions list */}
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#F0F4F8]">Active Sessions</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Verify and manage active device sessions.</p>
                  </div>
                  <button
                    onClick={refreshSession}
                    className="rounded-lg border border-[#262D38] bg-[#1E232E] px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#262D38] cursor-pointer transition-colors"
                  >
                    Refresh List
                  </button>
                </div>

                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-xl border border-[#262D38] bg-[#0B0E14] p-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <MonitorSmartphone className="h-4 w-4 mt-0.5 text-[#FFB300]" />
                        <div>
                          <div className="font-medium text-[#F0F4F8]">{session.device}</div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5">{session.location} • Last active {session.lastSeen}</div>
                        </div>
                      </div>
                      {session.current ? (
                        <span className="rounded-md bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 text-[11px] font-medium text-[#00E676] font-mono">
                          Current Device
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">Authenticated</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={clearSessions}
                  className="rounded-lg border border-[#262D38] bg-[#1E232E] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#262D38] cursor-pointer transition-colors"
                >
                  Revoke Other Sessions
                </button>
              </GlassCard>
            </div>
          )}

          {activeTab === 'danger' && (
            <GlassCard className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#F0F4F8]">Privacy & Data Governance</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Export your data or execute permanent account actions.</p>
              </div>

              {/* Privacy option */}
              <div className="flex items-center justify-between rounded-xl border border-[#262D38] bg-[#0B0E14] p-4 text-xs">
                <div>
                  <div className="font-medium text-[#F0F4F8]">Privacy Cloak Mode</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">Mask portfolio balances across all views and cards.</div>
                </div>
                <button
                  onClick={() => updatePreferences({ privacyMode: !preferences.privacyMode })}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                    preferences.privacyMode
                      ? 'border-[#FFB300]/30 bg-[#FFB300]/15 text-[#FFB300]'
                      : 'border-[#262D38] bg-[#1E232E] text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8]'
                  }`}
                >
                  {preferences.privacyMode ? 'Enabled' : 'Enable'}
                </button>
              </div>

              {/* Data controls */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Account Operations</div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#262D38] bg-[#0B0E14] px-4 py-3 text-xs font-medium text-[#F0F4F8] hover:bg-[#1E232E] hover:border-[#FFB300]/40 cursor-pointer transition-colors"
                  >
                    <Download className="h-4 w-4 text-[#FFB300]" />
                    Export Local Data (.JSON)
                  </button>

                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#FF5252]/30 bg-[#FF5252]/10 px-4 py-3 text-xs font-medium text-[#FF5252] hover:bg-[#FF5252]/20 cursor-pointer transition-colors"
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