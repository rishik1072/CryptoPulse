import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    forgotPassword,
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

    const ok = await forgotPassword(email.trim().toLowerCase())
    if (ok) {
      setIsSubmitted(true)
      toast.info('Password reset email sent. Please check your inbox.')
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
            {isSubmitted ? 'Check your email' : 'Reset your password'}
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

          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white">Reset Link Sent</h3>
              <p className="mt-2 text-sm text-slate-400">
                We've sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The link will expire in 1 hour. If you don't see it, check your spam folder.
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/sign-in', { replace: true })}
                  className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99]"
                >
                  Back to Sign In
                </button>
                <button
                  onClick={() => { setIsSubmitted(false); setEmail(''); clearMessages(); }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white"
                >
                  Send Another Link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-white">Reset Your Password</h3>
                <p className="mt-1 text-xs text-slate-400">Enter your email and we'll send you a reset link</p>
              </div>
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
              <button
                type="submit"
                className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <Link
                to="/sign-in"
                className="w-full text-center block text-xs text-slate-400 hover:text-white"
              >
                Back to Sign In
              </Link>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}