import { SignIn, SignUp } from '@clerk/clerk-react'

export default function Auth({ mode = 'sign-in' }: { mode?: 'sign-in' | 'sign-up' }) {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b1022]/80 p-8 text-center shadow-premium">
          <h1 className="text-2xl font-semibold tracking-tight">Clerk authentication is almost ready</h1>
          <p className="mt-3 text-sm text-muted">
            Add your Clerk publishable key to VITE_CLERK_PUBLISHABLE_KEY to enable Google, GitHub, and email sign-in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816] p-6">
      <div className="w-full max-w-md">
        {mode === 'sign-in' ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
        ) : (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
        )}
      </div>
    </div>
  )
}