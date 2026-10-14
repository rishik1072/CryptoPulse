import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BellRing, ShieldCheck, TrendingUp, Wallet2, Star, Clock, UserCheck } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useAlertStore } from '@/store/useAlertStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { computePortfolioValuation } from '@/services/priceResolver'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'

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
      <div className="mx-auto max-w-md rounded-xl border border-[#262D38] bg-[#151921] p-8 text-center my-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFB300]/15 text-[#FFB300] mx-auto mb-3 border border-[#FFB300]/30">
          <UserCheck className="h-6 w-6" />
        </div>
        <div className="text-base font-semibold text-[#F0F4F8]">Sign in to view your profile</div>
        <p className="mt-1 text-xs text-[#94A3B8]">Authentication is required to show your account metrics and trading desk activity.</p>
        <Link
          to="/sign-in"
          className="mt-4 inline-flex rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
        >
          Go to Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F4F8]">
              Account Profile
            </h1>
            <span className="text-[11px] font-medium font-mono text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 rounded-full">
              Active Session
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            Account identity, security verification status, and portfolio audit logs.
          </p>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <span>Edit Profile</span>
        </Link>
      </div>

      {/* 2. Main Profile Grid */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] items-start">
        {/* User Card */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#FFB300] text-lg font-bold text-slate-950 shadow-sm shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold tracking-tight text-[#F0F4F8] truncate">{user.name}</div>
              <div className="mt-0.5 text-xs text-[#94A3B8] font-mono truncate">{user.email}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="rounded-md border border-[#00E676]/30 bg-[#00E676]/10 px-2 py-0.5 text-[11px] font-medium text-[#00E676]">
                  Verified &bull; {user.provider === 'google' ? 'Google Auth' : 'Email Auth'}
                </div>
                <div className="rounded-md border border-[#262D38] bg-[#1E232E] px-2 py-0.5 text-[11px] font-medium text-[#94A3B8] font-mono">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
            <div className="rounded-lg border border-[#262D38] bg-[#0B0E14] p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                <span>Portfolio value</span>
                {portfolioSummary.isPartial && (
                  <span className="rounded bg-[#FFB300]/15 text-[9px] text-[#FFB300] px-1 font-mono">Partial</span>
                )}
              </div>
              <div className="mt-1 text-lg font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
                {portfolioSummary.hasPriced
                  ? `$${portfolioSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-[#262D38] bg-[#0B0E14] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Watchlist</div>
              <div className="mt-1 text-lg font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
                {watchlistItems.length} assets
              </div>
            </div>
            <div className="rounded-lg border border-[#262D38] bg-[#0B0E14] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Alerts</div>
              <div className="mt-1 text-lg font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
                {alerts.filter(a => a.enabled && !a.triggered).length} active
              </div>
            </div>
          </div>
        </div>

        {/* Security Posture Status */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F0F4F8]">
            <ShieldCheck className="h-4 w-4 text-[#00E676]" />
            <span>Security Posture</span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] p-2.5">
              <div>
                <div className="font-semibold text-[#F0F4F8]">Two-Factor Authentication</div>
                <div className="text-[11px] text-[#94A3B8]">Secondary verification for account actions.</div>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${hasTwoFactor ? 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30' : 'bg-[#1E232E] text-[#94A3B8] border border-[#262D38]'}`}>
                {hasTwoFactor ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] p-2.5">
              <div>
                <div className="font-semibold text-[#F0F4F8]">Google OAuth Account</div>
                <div className="text-[11px] text-[#94A3B8]">Third-party federated login link.</div>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${connectedGoogle ? 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30' : 'bg-[#1E232E] text-[#94A3B8] border border-[#262D38]'}`}>
                {connectedGoogle ? 'Linked' : 'Not Linked'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] p-2.5">
              <div>
                <div className="font-semibold text-[#F0F4F8]">Privacy Masking Mode</div>
                <div className="text-[11px] text-[#94A3B8]">Hides numerical balances in public spaces.</div>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${preferences.privacyMode ? 'bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30' : 'bg-[#1E232E] text-[#94A3B8] border border-[#262D38]'}`}>
                {preferences.privacyMode ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Grid: Activity History & Quick Navigation */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] items-start">
        {/* Activity Timeline Logs */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#F0F4F8]">
                Activity Audit Log
              </div>
              <div className="text-[11px] text-[#94A3B8]">Chronological security events and account activity.</div>
            </div>
            <div className="rounded border border-[#262D38] bg-[#1E232E] px-2 py-0.5 text-[10px] font-mono uppercase text-[#94A3B8]">
              Audit
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {!activityLogs || activityLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#262D38] p-8 text-center text-xs text-[#94A3B8]">
                <Clock className="mx-auto h-5 w-5 text-[#94A3B8] mb-1.5" />
                No activity logs recorded yet.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 rounded-lg border border-[#262D38] bg-[#0B0E14] p-2.5">
                  <div className="rounded bg-[#FFB300]/15 p-1 text-[#FFB300] shrink-0">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#F0F4F8] text-xs">{log.action}</div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Navigation Desk */}
        <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F0F4F8] mb-3">
            <TrendingUp className="h-4 w-4 text-[#FFB300]" />
            <span>Platform Shortcuts</span>
          </div>
          <div className="space-y-2">
            <Link
              to="/portfolio"
              className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-medium text-[#F0F4F8] transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/40"
            >
              <span className="flex items-center gap-2">
                <Wallet2 className="h-4 w-4 text-[#FFB300]" />
                Portfolio Valuation
              </span>
              <span className="text-[#FFB300] font-bold">&rarr;</span>
            </Link>
            <Link
              to="/watchlist"
              className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-medium text-[#F0F4F8] transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/40"
            >
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#FFB300]" />
                Manage Watchlist
              </span>
              <span className="text-[#FFB300] font-bold">&rarr;</span>
            </Link>
            <Link
              to="/alerts"
              className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-medium text-[#F0F4F8] transition-colors hover:bg-[#1E232E] hover:border-[#FFB300]/40"
            >
              <span className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[#FFB300]" />
                Price Alert Rules
              </span>
              <span className="text-[#FFB300] font-bold">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
