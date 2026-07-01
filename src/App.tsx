import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
import { QueryProvider } from '@/providers/QueryProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAlertEngine } from '@/services/alertEngine'
import { GlassCard } from '@/components/ui/GlassCard'
import Settings from '@/pages/Settings'
import ProfilePage from '@/pages/Profile'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { Sparkles, X } from 'lucide-react'

// Lazy loaded pages (code splitting)
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Markets = lazy(() => import('@/pages/Markets'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const AssetDetail = lazy(() => import('@/pages/AssetDetail'))

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const clerkSignInUrl = (import.meta.env.VITE_CLERK_SIGN_IN_URL as string | undefined) || '/sign-in'
const clerkSignUpUrl = (import.meta.env.VITE_CLERK_SIGN_UP_URL as string | undefined) || '/sign-up'
const clerkAfterSignInUrl = (import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL as string | undefined) || '/'
const clerkAfterSignOutUrl = (import.meta.env.VITE_CLERK_AFTER_SIGN_OUT_URL as string | undefined) || '/sign-in'
const clerkEnabled = Boolean(
  clerkPublishableKey &&
    clerkPublishableKey !== 'your_clerk_publishable_key_here' &&
    clerkPublishableKey.startsWith('pk_live_')
)

import { toast } from 'sonner'

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (clerkEnabled) {
    return (
      <>
        <SignedIn>
          <Outlet />
        </SignedIn>
        <SignedOut>
          <Navigate to="/sign-in" replace />
        </SignedOut>
      </>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [formMode, setFormMode] = useState<'sign-in' | 'sign-up'>(mode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [resetEmail, setResetEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Google mock popup state
  const [showGoogleMock, setShowGoogleMock] = useState(false)
  const [customGoogleEmail, setCustomGoogleEmail] = useState('')
  const [customGoogleName, setCustomGoogleName] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    signIn,
    signUp,
    signInWithGoogle,
    forgotPassword,
    resetPassword,
    error,
    success,
    isLoading,
    isAuthenticated,
    clearMessages,
    pendingResetEmail,
    pendingResetToken
  } = useAuthStore()

  useEffect(() => {
    clearMessages()
    setErrorLocal(null)
  }, [formMode, clearMessages])

  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  if (!clerkEnabled && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorLocal(null)

    if (formMode === 'sign-up') {
      if (!name.trim()) {
        setErrorLocal('Please enter a display name.')
        return
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorLocal('Please enter a valid email address.')
        return
      }
      if (password.length < 6) {
        setErrorLocal('Password must be at least 6 characters.')
        return
      }

      const ok = await signUp(name, email, password)
      if (ok) {
        toast.success('Account created successfully!')
        window.location.assign('/')
      }
      return
    }

    if (!email.trim() || !password) {
      setErrorLocal('Please enter your email and password.')
      return
    }

    const ok = await signIn(email, password, { rememberMe })
    if (ok) {
      toast.success('Welcome back!')
      window.location.assign('/')
    }
  }

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorLocal(null)
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorLocal('Please enter a valid email address to receive the token.')
      return
    }
    const ok = await forgotPassword(resetEmail)
    if (ok) {
      toast.info('Verification code created.')
    }
  }

  const handleResetConfirm = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorLocal(null)
    if (!resetToken.trim()) {
      setErrorLocal('Please enter the verification code.')
      return
    }
    if (newPassword.length < 6) {
      setErrorLocal('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorLocal('Passwords do not match.')
      return
    }
    const ok = await resetPassword(resetEmail || pendingResetEmail || '', resetToken, newPassword)
    if (ok) {
      toast.success('Password updated successfully!')
      setResetToken('')
      setNewPassword('')
      setConfirmPassword('')
      setFormMode('sign-in')
    }
  }

  const handleGoogleSelect = async (gName: string, gEmail: string, gAvatar: string) => {
    setIsGoogleLoading(true)
    setErrorLocal(null)
    try {
      const ok = await signInWithGoogle(gName, gEmail, gAvatar)
      if (ok) {
        toast.success(`Logged in as ${gName}`)
        setShowGoogleMock(false)
        window.location.assign('/')
      }
    } catch {
      setErrorLocal('Google login failed.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleCustomGoogleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!customGoogleName.trim() || !customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      toast.error('Please enter a valid name and email.')
      return
    }
    const seed = encodeURIComponent(customGoogleEmail.trim())
    const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`
    handleGoogleSelect(customGoogleName.trim(), customGoogleEmail.trim(), avatar)
  }

  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6 text-slate-100 font-sans">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-violet-600 to-sky-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              CryptoPulse
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Your institutional-grade trading desk
            </p>
          </div>

          <GlassCard className="relative overflow-hidden border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-xl sm:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(109,40,217,0.1),_transparent_60%)]" />

            {/* Error notifications */}
            {(error || errorLocal) && (
              <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {errorLocal || error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {success}
              </div>
            )}

            {/* Simulated Password Reset Code Entry */}
            {pendingResetEmail && !pendingResetToken ? (
              <form onSubmit={handleResetConfirm} className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-white">Reset Your Password</h3>
                  <p className="mt-1 text-xs text-slate-400">Enter the token sent to {pendingResetEmail}</p>
                </div>
                <div className="space-y-2">
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder="Enter reset token"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating…' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full text-center text-xs text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                {/* Social Login Section */}
                <button
                  type="button"
                  onClick={() => setShowGoogleMock(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-[0.99]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">or</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Email Sign In / Sign Up Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formMode === 'sign-up' && (
                    <div>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Display name"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email address"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  {formMode === 'sign-in' && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                          className="rounded border-white/10 bg-white/5 accent-violet-600 focus:ring-0"
                        />
                        Remember this device
                      </label>
                      <button
                        type="button"
                        onClick={() => { setResetEmail(email); setFormMode('sign-in'); clearMessages(); }}
                        className="text-xs font-medium text-violet-400 hover:text-violet-300"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing…' : formMode === 'sign-up' ? 'Create Account' : 'Sign In'}
                  </button>
                </form>

                {/* Form Mode Toggle */}
                <div className="text-center text-xs text-slate-400">
                  {formMode === 'sign-in' ? (
                    <>
                      New to CryptoPulse?{' '}
                      <button
                        type="button"
                        onClick={() => { setFormMode('sign-up'); clearMessages(); }}
                        className="font-semibold text-violet-400 hover:text-violet-300"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setFormMode('sign-in'); clearMessages(); }}
                        className="font-semibold text-violet-400 hover:text-violet-300"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>

                {/* Forgot Password Link Panel */}
                {formMode === 'sign-in' && !pendingResetEmail && resetEmail !== '' ? (
                  <form onSubmit={handlePasswordReset} className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reset Password Link</div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="Confirm email address"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                      disabled={isLoading}
                    >
                      Request Reset Token
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Google Mock Login Selection Modal */}
        {showGoogleMock && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <GlassCard className="w-full max-w-sm border border-white/10 bg-slate-900 text-slate-100 p-6 shadow-premium">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">Sign in with Google</h3>
                  <p className="text-xs text-slate-400 mt-1">Choose an account to continue to CryptoPulse</p>
                </div>
                <button
                  onClick={() => setShowGoogleMock(false)}
                  className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isGoogleLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <p className="mt-4 text-xs text-slate-400">Authenticating account...</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {/* Account List */}
                  <div className="space-y-2">
                    {[
                      { name: 'Rishi Kumar', email: 'rishi@gmail.com', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=rishi' },
                      { name: 'Groww Investor', email: 'investor@groww.in', avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=groww' }
                    ].map((account) => (
                      <button
                        key={account.email}
                        onClick={() => handleGoogleSelect(account.name, account.email, account.avatar)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left hover:bg-white/10 transition-colors"
                      >
                        <img src={account.avatar} alt={account.name} className="h-8 w-8 rounded-full border border-white/10 bg-slate-800" />
                        <div>
                          <div className="text-sm font-medium text-white">{account.name}</div>
                          <div className="text-xs text-slate-400">{account.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-2 text-[9px] font-semibold text-slate-500 uppercase tracking-widest">or use another</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  {/* Manual custom Google Login */}
                  <form onSubmit={handleCustomGoogleSubmit} className="space-y-2.5">
                    <input
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="Google Display Name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="Google Email (e.g. user@gmail.com)"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-violet-600 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
                    >
                      Authenticate Account
                    </button>
                  </form>
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6">
      <div className="w-full max-w-md">
        {mode === 'sign-in' ? (
          <SignIn routing="path" path={clerkSignInUrl} signUpUrl={clerkSignUpUrl} forceRedirectUrl={clerkAfterSignInUrl} />
        ) : (
          <SignUp routing="path" path={clerkSignUpUrl} signInUrl={clerkSignInUrl} forceRedirectUrl={clerkAfterSignInUrl} />
        )}
      </div>
    </div>
  )
}

function ThemeSync() {
  const { preferences } = useAuthStore()
  const { setTheme } = useUIStore()

  useEffect(() => {
    const resolvedTheme = preferences.theme === 'dark' ? 'dark' : 'light'
    setTheme(resolvedTheme)

    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [preferences.theme, setTheme])

  return null
}

function AppRoutes() {
  const location = useLocation()
  useAlertEngine()

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Overview',
      '/markets': 'Markets',
      '/portfolio': 'Portfolio',
      '/watchlist': 'Watchlist',
      '/alerts': 'Alerts',
      '/settings': 'Settings',
    }

    const matchedRoute = Object.keys(routeTitles).find((route) => location.pathname === route || location.pathname.startsWith(`${route}/`)) ?? '/'
    document.title = `CryptoPulse • ${routeTitles[matchedRoute] ?? 'Premium Crypto Dashboard'}`

    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute('content', `CryptoPulse • ${routeTitles[matchedRoute] ?? 'Premium Crypto Dashboard'} with live market intelligence.`)
    }
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
      <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <AppLayout />
            </ErrorBoundary>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="markets"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Markets />
              </Suspense>
            }
          />
          <Route
            path="portfolio"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Portfolio />
              </Suspense>
            }
          />
          <Route
            path="watchlist"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Watchlist />
              </Suspense>
            }
          />
          <Route
            path="alerts"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Alerts />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Settings />
              </Suspense>
            }
          />
          <Route
            path="asset/:coinId"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <AssetDetail />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { refreshSession, isHydrated } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isHydrated) {
      refreshSession().finally(() => setChecking(false))
    }
  }, [isHydrated, refreshSession])

  // Safety fallback: if isHydrated never fires (e.g. storage blocked), unblock after 2s
  useEffect(() => {
    const timer = setTimeout(() => setChecking(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <div className="mt-4 text-sm text-slate-400 font-medium">Securing connection...</div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  const routes = (
    <QueryProvider>
      <BrowserRouter>
        <AppInitializer>
          <ThemeSync />
          <AppRoutes />
        </AppInitializer>
      </BrowserRouter>
    </QueryProvider>
  )

  if (!clerkEnabled) {
    return routes
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey ?? ''}
      signInUrl={clerkSignInUrl}
      signUpUrl={clerkSignUpUrl}
      signInFallbackRedirectUrl={clerkAfterSignInUrl}
      signUpFallbackRedirectUrl={clerkAfterSignInUrl}
      afterSignOutUrl={clerkAfterSignOutUrl}
      appearance={{
        variables: {
          colorPrimary: '#8b5cf6',
          colorText: '#f8fafc',
          colorBackground: '#060b18',
          colorInputBackground: '#0b1022',
          colorInputText: '#f8fafc',
          borderRadius: '16px',
        },
      }}
    >
      {routes}
    </ClerkProvider>
  )
}

export default App
