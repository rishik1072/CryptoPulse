import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
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
      <div className="flex min-h-screen items-center justify-center bg-[#0B0E14] p-4 text-[#F0F4F8] font-sans">
        <div className="w-full max-w-[400px]">
          <div className="rounded-xl border border-[#262D38] bg-[#151921] p-8 text-center shadow-xl">
            <div className="flex items-center justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FFB300] border-t-transparent" />
              <div className="ml-3 text-xs text-[#94A3B8] font-medium">Verifying reset credentials…</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground font-sans">
        <div className="w-full max-w-[400px]">
          <div className="rounded-xl border border-[#262D38] bg-[#151921] p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/20">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-[#F0F4F8] font-heading">Invalid or Expired Link</h2>
            <p className="mt-1.5 text-xs text-[#94A3B8] leading-relaxed">
              This password reset link is invalid or has expired. Please request a new security link.
            </p>
            <div className="mt-5">
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors shadow-md shadow-[#FFB300]/15"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Request New Link</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground font-sans">
      <div className="w-full max-w-[400px] space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFB300] text-slate-950 font-bold shadow-md shadow-[#FFB300]/20">
            <Sparkles className="h-5 w-5 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F4F8] font-heading">
            CryptoPulse
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Set your new account password
          </p>
        </div>

        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-6 shadow-xl">
          {(error || errorLocal) && (
            <div className="mb-4 rounded-lg border border-[#FF5252]/20 bg-[#FF5252]/10 p-3 text-xs text-[#FF5252] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorLocal || error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[#00E676]/20 bg-[#00E676]/10 p-3 text-xs text-[#00E676] flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password (min 6 chars)"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-10 pr-10 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F0F4F8] p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="sr-only">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-10 pr-10 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#FFB300] hover:bg-[#FFA000] py-2.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#FFB300]/15"
              disabled={isLoading}
            >
              {isLoading ? 'Updating password…' : 'Update Password'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#94A3B8]">
            <Link
              to="/sign-in"
              className="font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}