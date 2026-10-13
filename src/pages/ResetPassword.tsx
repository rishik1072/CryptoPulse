import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  const {
    resetPassword,
    error,
    success,
    isLoading,
    isAuthenticated,
    clearMessages,
  } = useAuthStore()

  // Check if we have a valid token in the URL or an active recovery session
  const isValidToken = useMemo(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const code = searchParams.get('code')
    return !!((token && type === 'recovery') || code || type === 'recovery' || isAuthenticated)
  }, [searchParams, isAuthenticated])

  useEffect(() => {
    clearMessages()
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setIsCheckingToken(false), 0)
  }, [clearMessages])

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorLocal(null)

    if (password.length < 6) {
      setErrorLocal('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setErrorLocal('Passwords do not match.')
      return
    }

    const ok = await resetPassword(password)
    if (ok) {
      toast.success('Password updated successfully!')
      navigate('/sign-in', { replace: true })
    }
  }

  if (isCheckingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6 text-slate-100 font-sans">
        <div className="w-full max-w-[420px]">
          <GlassCard className="border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <div className="ml-4 text-sm text-slate-400 font-medium">Verifying reset link...</div>
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6 text-slate-100 font-sans">
        <div className="w-full max-w-[420px]">
          <GlassCard className="border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-xl sm:p-8">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
              <h2 className="mt-4 text-xl font-semibold">Invalid or Expired Link</h2>
              <p className="mt-2 text-sm text-slate-400">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Request New Link
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    )
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
            Set your new password
          </p>
        </div>

        <GlassCard className="relative overflow-hidden border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-xl sm:p-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(109,40,217,0.1),_transparent_60%)]" />

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
              <label htmlFor="password" className="sr-only">New password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password (min 6 chars)"
                  autoComplete="new-password"
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
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 pr-12"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating password…' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <Link
              to="/sign-in"
              className="font-semibold text-violet-400 hover:text-violet-300"
            >
              Back to Sign In
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}