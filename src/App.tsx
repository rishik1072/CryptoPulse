import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
import { QueryProvider } from '@/providers/QueryProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAlertEngine } from '@/services/alertEngine'
import { GlassCard } from '@/components/ui/GlassCard'
import Settings from '@/pages/Settings'

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

function ProtectedRoute() {
  if (!clerkEnabled) {
    return <Outlet />
  }

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

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">CryptoPulse</h1>
            <p className="mt-1 text-muted">Authentication is currently running in fallback mode</p>
          </div>

          <GlassCard className="space-y-4 text-sm text-muted">
            <p>
              Add a valid Clerk publishable key to <span className="font-medium text-white">VITE_CLERK_PUBLISHABLE_KEY</span> to enable Google,
              GitHub, and email sign-in. Until then, the dashboard remains accessible in fallback mode.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6">
              <div className="font-medium text-white">What’s included</div>
              <ul className="mt-2 space-y-1">
                <li>• Secure session persistence</li>
                <li>• Protected app routes</li>
                <li>• Real user profile and avatar</li>
                <li>• Settings and sign-out flow</li>
              </ul>
            </div>
          </GlassCard>
        </div>
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

function App() {
  useAlertEngine()

  const routes = (
    <QueryProvider>
      <BrowserRouter>
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
