import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, formatAuthError } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
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
    <div className="flex min-h-screen items-center justify-center bg-[#0B0E14] p-4 text-[#F0F4F8] font-sans">
      <div className="w-full max-w-[400px] space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFB300] text-slate-950 font-bold shadow-md shadow-[#FFB300]/20">
            <Sparkles className="h-5 w-5 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F4F8] font-heading">
            CryptoPulse
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Completing authentication…
          </p>
        </div>

        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-8 text-center shadow-xl">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FFB300] border-t-transparent" />
            <p className="mt-4 text-xs text-[#94A3B8] font-medium">Please wait while we secure your connection…</p>
          </div>
        </div>
      </div>
    </div>
  )
}