import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BellRing, ShieldCheck, TrendingUp, Wallet2, Star, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { computePortfolioValuation } from '@/services/priceResolver'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { GlassCard } from '@/components/ui/GlassCard'

export default function ProfilePage() {
  const { user, preferences, hasTwoFactor, connectedGoogle, activityLogs } = useAuthStore()
  const { holdings } = usePortfolioStore()
  const { items: watchlistItems } = useWatchlistStore()
  const { alerts } = useAlertStore()
  const { prices: livePrices, connectionStatus } = useLivePriceStore()

  const holdingCoinIds = useMemo(() => holdings.map((h) => h.coinId).filter(Boolean), [holdings])
  const { data: topMarkets = [] } = useMarketData(50)
  const { data: specificMarkets = [] } = useCoinsMarketData(holdingCoinIds, topMarkets)

  const marketDataMap = useMemo(() => {
    const map: Record<string, CoinMarketData> = {}
    for (const coin of topMarkets) {
      map[coin.id.toLowerCase()] = coin
      map[coin.symbol.toLowerCase()] = coin
      map[coin.symbol.toUpperCase()] = coin
    }
    for (const coin of specificMarkets) {
      map[coin.id.toLowerCase()] = coin
      map[coin.symbol.toLowerCase()] = coin
      map[coin.symbol.toUpperCase()] = coin
    }
    return map
  }, [topMarkets, specificMarkets])

  const portfolioSummary = useMemo(() => {
    const { metrics } = computePortfolioValuation(holdings, livePrices, marketDataMap, connectionStatus)
    return {
      total: metrics.totalValue,
      pricedCount: metrics.valuedCount,
      isPartial: metrics.isIncomplete,
      hasPriced: metrics.valuedCount > 0,
    }
  }, [holdings, livePrices, marketDataMap, connectionStatus])

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl rounded-[28px] border border-slate-200 bg-white/80 p-8 text-center dark:border-slate-800 dark:bg-slate-950/80">
        <div className="text-xl font-semibold text-slate-900 dark:text-white">Sign in to view your profile</div>
        <p className="mt-2 text-sm text-slate-500">Authentication is required to show your details and portfolio activity.</p>
        <Link to="/sign-in" className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950">Go to sign in</Link>
      </div>
    )
  }

  const isDark = false // unused but kept for potential future theming
  void isDark

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Profile</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your account metrics, security configurations, and live history.</p>
        </div>
        <Link to="/settings" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950 hover:scale-[1.01] transition-transform">
          Edit profile
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* User Card info */}
        <GlassCard className="card-sheen">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-violet-600 to-sky-500 text-2xl font-semibold text-white shadow-md">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{user.name}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-250 bg-emerald-50 dark:border-emerald-950 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Verified account • {user.provider === 'google' ? 'Google Connect' : 'Secure Email'}
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                <span>Portfolio value</span>
                {portfolioSummary.isPartial && (
                  <span className="rounded bg-amber-500/10 px-1 text-[9px] text-amber-500">Partial</span>
                )}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {portfolioSummary.hasPriced
                  ? `$${portfolioSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Watchlist</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{watchlistItems.length} coins</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Alerts</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{alerts.length} active</div>
            </div>
          </div>
        </GlassCard>

        {/* Security Configurations status */}
        <GlassCard className="card-sheen">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" /> Security posture
          </div>
          <div className="mt-4 space-y-3.5 text-sm">
            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Two-Factor Auth</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Secure operations using secondary tokens.</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasTwoFactor ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {hasTwoFactor ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Google Integration</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Linked third-party sign-in option.</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${connectedGoogle ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {connectedGoogle ? 'Linked' : 'Not Linked'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Privacy Mode</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hides numbers on sensitive dashboards.</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${preferences.privacyMode ? 'bg-violet-50 text-violet-750 dark:bg-violet-500/10 dark:text-violet-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {preferences.privacyMode ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Dynamic Activity timeline logs */}
        <GlassCard className="card-sheen">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity Log</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Timeline of security events and actions.</div>
            </div>
            <div className="rounded-full border border-slate-250 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              System Audit
            </div>
          </div>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
            {!activityLogs || activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-250 p-8 text-center text-sm text-slate-550 dark:border-slate-850">
                <Clock className="mx-auto h-7 w-7 text-slate-400 mb-2" />
                No activity logs recorded yet.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-[18px] border border-slate-250 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="rounded-xl bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
                    <Activity className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-850 dark:text-slate-100 text-sm">{log.action}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Quick action buttons */}
        <GlassCard className="card-sheen self-start">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <TrendingUp className="h-4.5 w-4.5 text-violet-600" /> Account Navigation
          </div>
          <div className="mt-4 space-y-3">
            <Link to="/portfolio" className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4.5 py-3.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900">
              <span className="flex items-center gap-2">
                <Wallet2 className="h-4 w-4 text-violet-600" />
                Open Portfolio desk
              </span>
              <span className="text-violet-600 font-bold">→</span>
            </Link>
            <Link to="/watchlist" className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4.5 py-3.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-violet-600" />
                Manage Watchlist
              </span>
              <span className="text-violet-600 font-bold">→</span>
            </Link>
            <Link to="/alerts" className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/80 px-4.5 py-3.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900">
              <span className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-violet-600" />
                Evaluate Price Alerts
              </span>
              <span className="text-violet-600 font-bold">→</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
