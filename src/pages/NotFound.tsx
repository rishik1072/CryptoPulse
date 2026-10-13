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
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600/20 to-sky-500/20 text-violet-600 dark:text-violet-400">
            <Compass className="h-8 w-8 animate-spin" style={{ animationDuration: '12s' }} />
          </div>

          <div className="text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            404
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Page Not Found
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            The market coordinate or destination you requested does not exist or has been relocated.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              Back to Overview
            </Link>
            <Link
              to="/markets"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <TrendingUp className="h-4 w-4" />
              Explore Markets
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
