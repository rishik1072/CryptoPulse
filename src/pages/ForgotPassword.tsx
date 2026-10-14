import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
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
            {isSubmitted ? 'Password reset verification' : 'Reset your account password'}
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

          {isSubmitted ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/25">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm text-[#F0F4F8] font-heading">Reset Link Sent</h3>
              <p className="mt-1.5 text-xs text-[#94A3B8] leading-relaxed">
                We've sent a password reset instruction to <span className="font-medium text-[#F0F4F8]">{email}</span>
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]/70">
                The link expires in 1 hour. Check your spam folder if you do not see it.
              </p>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/sign-in', { replace: true })}
                  className="w-full rounded-lg bg-[#FFB300] hover:bg-[#FFA000] py-2.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
                >
                  Return to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false)
                    setEmail('')
                    clearMessages()
                  }}
                  className="w-full text-center text-xs text-[#94A3B8] hover:text-[#F0F4F8] pt-1 cursor-pointer transition-colors"
                >
                  Send to a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-10 pr-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#FFB300] hover:bg-[#FFA000] py-2.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#FFB300]/15"
                disabled={isLoading}
              >
                {isLoading ? 'Sending instructions…' : 'Send Reset Link'}
              </button>
              <div className="text-center pt-2">
                <Link
                  to="/sign-in"
                  className="text-xs font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}