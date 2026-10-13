import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAlertEngine } from '@/services/alertEngine'
import Settings from '@/pages/Settings'
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

  if (!isHydrated || !initialized || loading) {
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
