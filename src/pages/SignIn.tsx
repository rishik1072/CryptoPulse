import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, formatAuthError, isSupabaseConfigured } from '@/lib/supabase'

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
        const msg = formatAuthError(error)
        setErrorLocal(msg)
        toast.error(msg)
      }
    } catch (err) {
      const msg = formatAuthError(err)
      setErrorLocal(msg)
      toast.error(msg)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground font-sans">
      <div className="w-full max-w-[400px] space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFB300] text-slate-950 shadow-sm">
            <Sparkles className="h-5 w-5 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F4F8] font-heading">
            CryptoPulse
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Institutional cryptocurrency market intelligence
          </p>
        </div>

        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-6 shadow-sm">
          {/* Setup notice banner when credentials are not yet configured */}
          {!isSupabaseConfigured() && (
            <div className="mb-4 rounded-lg border border-[#FFB300]/30 bg-[#FFB300]/10 p-3 text-xs text-[#FFB300]">
              <div className="flex items-center gap-2 font-medium text-[#FFB300]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Supabase Configuration Required</span>
              </div>
              <p className="mt-1 leading-relaxed text-[#F0F4F8] text-[11px]">
                Set <code className="font-mono text-[#FFB300]">VITE_SUPABASE_URL</code> and <code className="font-mono text-[#FFB300]">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono text-[#F0F4F8]">.env</code> to connect your project.
              </p>
            </div>
          )}

          {/* Error notifications */}
          {(error || errorLocal) && (
            <div className="mb-4 rounded-lg border border-[#FF5252]/30 bg-[#FF5252]/10 p-3 text-xs text-[#FF5252] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errorLocal || error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[#00E676]/30 bg-[#00E676]/10 p-3 text-xs text-[#00E676] flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-10 pr-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-10 pr-10 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F0F4F8] p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-[#94A3B8] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="rounded border-[#262D38] bg-[#0B0E14] accent-[#FFB300] focus:ring-0"
                />
                <span>Remember device</span>
              </label>
              <Link
                to="/forgot-password"
                className="font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#FFB300] hover:bg-[#FFA000] py-2.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Google OAuth Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#262D38] bg-[#0B0E14] hover:bg-[#1E232E] px-4 py-2.5 text-xs font-medium text-[#F0F4F8] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Globe className="h-4 w-4 text-[#94A3B8]" />
              <span>{isGoogleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Form Mode Toggle */}
          <div className="mt-5 text-center text-xs text-[#94A3B8]">
            New to CryptoPulse?{' '}
            <Link
              to="/sign-up"
              className="font-semibold text-[#FFB300] hover:text-[#FFA000] transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
