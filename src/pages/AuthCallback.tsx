import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, formatAuthError } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setLoading, clearMessages } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      setLoading(true)
      clearMessages()

      try {
        // Check for error in URL (OAuth error)
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('OAuth error:', error, errorDescription)
          toast.error(errorDescription || 'Authentication failed. Please try again.')
          navigate('/sign-in', { replace: true })
          return
        }

        // Check for PKCE code in URL
        const code = searchParams.get('code')
        
        if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            toast.error(formatAuthError(exchangeError))
            navigate('/sign-in', { replace: true })
            return
          }
          
          toast.success('Successfully signed in!')
          navigate('/', { replace: true })
        } else {
          // Check for recovery redirect or already detected session
          const type = searchParams.get('type')
          const { data: { session } } = await supabase.auth.getSession()

          if (type === 'recovery') {
            navigate('/reset-password', { replace: true })
          } else if (session) {
            toast.success('Successfully signed in!')
            navigate('/', { replace: true })
          } else {
            navigate('/sign-in', { replace: true })
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('An unexpected error occurred during authentication.')
        navigate('/sign-in', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [searchParams, navigate, setLoading, clearMessages])

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
            Completing authentication...
          </p>
        </div>

        <GlassCard className="relative overflow-hidden border border-white/10 bg-slate-900/80 p-6 shadow-premium backdrop-blur-xl sm:p-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(109,40,217,0.1),_transparent_60%)]" />
          
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-violet-500 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-400">Please wait while we complete your sign in...</p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}