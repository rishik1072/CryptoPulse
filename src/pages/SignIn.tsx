import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    signIn,
    error,
    success,
    isLoading,
    isAuthenticated,
    clearMessages,
  } = useAuthStore()

  useEffect(() => {
    clearMessages()
  }, [clearMessages])

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorLocal(null)

    if (!email.trim() || !email.includes('@')) {
      setErrorLocal('Please enter a valid email address.')
      return
    }
    if (!password) {
      setErrorLocal('Please enter your password.')
      return
    }

    const ok = await signIn(email.trim().toLowerCase(), password, { rememberMe })
    if (ok) {
      toast.success('Welcome back!')
      navigate('/', { replace: true })
    } else {
      const err = useAuthStore.getState().error
      if (err) toast.error(err)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setErrorLocal(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      
      if (error) {
        console.error('Google OAuth error:', error)
        setErrorLocal('Failed to initiate Google sign-in. Please try again.')
        toast.error('Failed to initiate Google sign-in. Please try again.')
      }
    } catch {
      setErrorLocal('Google sign-in failed. Please try again.')
      toast.error('Google sign-in failed. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

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
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errorLocal || error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
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
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Google OAuth Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition-all hover:bg-white/10 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Globe className="h-5 w-5" />
              {isGoogleLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
          </div>

          {/* Form Mode Toggle */}
          <div className="mt-6 text-center text-xs text-slate-400">
            New to CryptoPulse?{' '}
            <Link
              to="/sign-up"
              className="font-semibold text-violet-400 hover:text-violet-300"
            >
              Create an account
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
