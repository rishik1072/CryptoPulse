import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAlertEngine } from '@/services/alertEngine'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'

// Lazy loaded pages (code splitting)
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Markets = lazy(() => import('@/pages/Markets'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const AssetDetail = lazy(() => import('@/pages/AssetDetail'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Profile = lazy(() => import('@/pages/Profile'))
const News = lazy(() => import('@/pages/News'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function ProtectedRoute() {
  const { user, loading, initialized } = useAuth()
  const { isAuthenticated } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <div className="mt-4 text-sm text-slate-400 font-medium">Securing connection...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
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
      '/profile': 'Profile',
      '/news': 'News Center',
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
      <Route
        path="/sign-in"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <SignIn />
          </Suspense>
        }
      />
      <Route
        path="/sign-up"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <SignUp />
          </Suspense>
        }
      />
      <Route
        path="/auth/callback"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <AuthCallback />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ResetPassword />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ForgotPassword />
          </Suspense>
        }
      />

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
            path="profile"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <Profile />
              </Suspense>
            }
          />
          <Route
            path="news"
            element={
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <News />
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

      <Route
        path="*"
        element={
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  )
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { loading, initialized } = useAuth()
  const { isHydrated } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    // 6-second failsafe to prevent indefinite stall if network or authentication stalls
    const timer = setTimeout(() => {
      setTimedOut(true)
    }, 6000)

    return () => clearTimeout(timer)
  }, [])

  if (!isHydrated || !initialized || loading) {
    if (timedOut) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] p-6 text-white text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">Connection Timeout</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-sm">
            Unable to establish connection to authentication services within the expected time window.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition"
            >
              Retry Connection
            </button>
            <a
              href="/sign-in"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Proceed to Sign In
            </a>
          </div>
        </div>
      )
    }

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
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppInitializer>
            <ThemeSync />
            <AppRoutes />
          </AppInitializer>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App
