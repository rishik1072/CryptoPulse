import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, Home, TrendingUp } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <GlassCard className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30 shadow-md shadow-[#FFB300]/10">
            <Compass className="h-7 w-7 animate-spin" style={{ animationDuration: '12s' }} />
          </div>

          <div className="text-5xl font-extrabold tracking-tight text-[#F0F4F8] font-mono tabular-nums">
            404
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#F0F4F8] sm:text-2xl font-heading">
            Resource Not Found
          </h1>
          <p className="mt-2 text-xs text-[#94A3B8] max-w-sm mx-auto">
            The market coordinate or destination you requested does not exist or has been relocated.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFB300] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-[#FFA000] shadow-md shadow-[#FFB300]/15"
            >
              <Home className="h-3.5 w-3.5 text-slate-950" />
              Back to Overview
            </Link>
            <Link
              to="/markets"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#262D38] bg-[#1E232E] px-4 py-2 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-[#262D38] hover:text-[#F0F4F8]"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Explore Markets
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
