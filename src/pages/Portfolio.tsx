import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { computePortfolioValuation } from '@/services/priceResolver'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AddAssetModal } from '@/components/portfolio/AddAssetModal'
import { Plus, Trash2, ChevronRight, AlertTriangle, AlertCircle, Radio, Loader2, Wallet, RefreshCw, Database } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'

const COLORS = ['#FFB300', '#00E676', '#38BDF8', '#818CF8', '#F472B6', '#FB923C', '#A78BFA', '#34D399']

export default function Portfolio() {
  const { holdings, removeHolding, isLoading, error, retrySync } = usePortfolioStore()
  const { prices: livePrices, connectionStatus } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const isMissingTable = useMemo(() => {
    if (!error) return false
    const lower = error.toLowerCase()
    return (
      lower.includes("could not find the table 'public.holdings'") ||
      lower.includes("could not find the table") ||
      lower.includes('schema cache') ||
      lower.includes('pgrst205') ||
      lower.includes('relation "holdings" does not exist') ||
      lower.includes('relation "public.holdings" does not exist')
    )
  }, [error])

  const isFailedLoad = Boolean(error && holdings.length === 0)
  const isCachedFallback = Boolean(error && holdings.length > 0)

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

  const { valuations: portfolioData, metrics } = useMemo(
    () => computePortfolioValuation(holdings, livePrices, marketDataMap, connectionStatus),
    [holdings, livePrices, marketDataMap, connectionStatus]
  )

  const filteredHoldings = portfolioData.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.symbol.toLowerCase().includes(search.toLowerCase())
  )

  const { totalValue, totalProfit, totalRoi, valuedCount, missingCount, isIncomplete } = metrics

  const valuedHoldings = portfolioData.filter(
    (h): h is typeof h & { currentValue: number; profit: number; roi: number } =>
      h.isPriced && h.currentValue !== null && h.profit !== null && h.roi !== null
  )

  const bestPerformer = [...valuedHoldings].sort((a, b) => b.roi - a.roi)[0]
  const worstPerformer = [...valuedHoldings].sort((a, b) => a.roi - b.roi)[0]

  const allocationData = valuedHoldings.map((h, index) => ({
    name: h.symbol.toUpperCase(),
    value: h.currentValue,
    color: COLORS[index % COLORS.length],
    pct: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
    image: h.image,
  }))

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Unified Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F4F8]">
              Portfolio Valuation
            </h1>
            {isFailedLoad ? (
              <span
                data-testid="portfolio-status-badge"
                className="text-[11px] font-medium font-mono text-[#FF5252] bg-[#FF5252]/10 border border-[#FF5252]/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" /> Sync Error
              </span>
            ) : isCachedFallback ? (
              <span
                data-testid="portfolio-status-badge"
                className="text-[11px] font-medium font-mono text-[#FFB300] bg-[#FFB300]/10 border border-[#FFB300]/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              >
                {portfolioData.length} Holdings (Cached)
              </span>
            ) : (
              <span
                data-testid="portfolio-status-badge"
                className="text-[11px] font-medium font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-full"
              >
                {portfolioData.length} Holdings
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Real-time position tracking, asset allocation, and multi-source accounting.</span>
            <span className="text-border">&bull;</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Radio className={`h-3 w-3 ${connectionStatus === 'connected' ? 'text-positive animate-pulse' : 'text-muted'}`} />
              {connectionStatus === 'connected' ? 'Binance live feed' : connectionStatus === 'reconnecting' ? 'Reconnecting feed' : 'Polling REST feed'}
            </span>
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-accent ml-1 font-mono">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <button
              onClick={() => retrySync()}
              disabled={isLoading}
              data-testid="portfolio-header-retry-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              title="Retry synchronizing portfolio with database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-accent' : 'text-muted'}`} />
              <span>{isLoading ? 'Retrying...' : 'Retry'}</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Database error banner */}
      {error && (
        <div
          data-testid="portfolio-error-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#FF5252]/30 bg-[#FF5252]/10 p-4 text-xs text-[#FF5252]"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-[#FF5252] mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-[#F0F4F8] text-sm">
                {isMissingTable
                  ? "Database Setup Required: Table 'public.holdings' Not Found"
                  : isCachedFallback
                  ? 'Database Sync Notice (Using Locally Cached Holdings)'
                  : 'Database Connection Error'}
              </div>
              <p className="text-[#F0F4F8]/85 leading-relaxed">
                {isMissingTable ? (
                  <>
                    The table <code className="px-1 py-0.5 rounded bg-[#0B0E14] text-[#FFB300] font-mono text-[11px]">public.holdings</code> does not exist in the database schema cache. Please execute migrations <code className="px-1 py-0.5 rounded bg-[#0B0E14] text-[#FFB300] font-mono text-[11px]">20240101000000_initial_schema.sql</code> and <code className="px-1 py-0.5 rounded bg-[#0B0E14] text-[#FFB300] font-mono text-[11px]">20240102000000_phase3_user_persistence.sql</code> in your Supabase SQL Editor.
                  </>
                ) : (
                  `Unable to synchronize holdings with Supabase: ${error}`
                )}
              </p>
              <div className="text-[11px] font-mono text-[#FF5252]/80">
                Persistence Notice: {error}
              </div>
            </div>
          </div>
          <button
            onClick={() => retrySync()}
            disabled={isLoading}
            data-testid="portfolio-banner-retry-btn"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FF5252] hover:bg-[#FF3B3B] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Retrying...' : 'Retry Connection'}</span>
          </button>
        </div>
      )}

      {/* Incomplete valuation warning banner */}
      {isIncomplete && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#FFB300]/30 bg-[#FFB300]/10 p-3.5 text-xs text-[#FFB300]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFB300]" />
          <div>
            <span className="font-semibold text-[#F0F4F8]">Incomplete Valuation Notice: </span>
            {missingCount} of {portfolioData.length} asset{missingCount > 1 ? 's' : ''} currently lack active market prices.
            Portfolio totals reflect only assets with verified price feeds. Unpriced assets are not assumed to equal buy prices.
          </div>
        </div>
      )}

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Total Value */}
        <SpotlightCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-[#94A3B8]">
            <span>Total Value</span>
            {isIncomplete && !isFailedLoad && (
              <span className="rounded bg-[#FFB300]/15 border border-[#FFB300]/30 px-1.5 py-0.2 text-[9px] font-semibold text-[#FFB300]">
                Partial
              </span>
            )}
            {isFailedLoad && (
              <span className="rounded bg-[#FF5252]/15 border border-[#FF5252]/30 px-1.5 py-0.2 text-[9px] font-semibold text-[#FF5252]">
                Error
              </span>
            )}
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#F0F4F8] tabular-nums">
            {isFailedLoad ? (
              <span data-testid="portfolio-total-value" className="text-[#FF5252] text-xl font-bold font-mono">Unavailable</span>
            ) : valuedCount > 0 ? (
              <AnimatedCounter value={totalValue} prefix="$" decimals={2} />
            ) : (
              <span data-testid="portfolio-total-value" className="text-[#94A3B8] text-2xl font-normal">—</span>
            )}
          </div>
          <div className="mt-2 text-xs text-[#94A3B8] font-mono">
            {isFailedLoad
              ? 'Database synchronization failed'
              : isIncomplete
              ? `${valuedCount} of ${portfolioData.length} holdings priced`
              : `${portfolioData.length} asset${portfolioData.length === 1 ? '' : 's'} tracked`}
          </div>
        </SpotlightCard>

        {/* Total P&L */}
        <SpotlightCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-[#94A3B8]">
            <span>Total P&amp;L</span>
            {isIncomplete && !isFailedLoad && (
              <span className="rounded bg-[#FFB300]/15 border border-[#FFB300]/30 px-1.5 py-0.2 text-[9px] font-semibold text-[#FFB300]">
                Priced Only
              </span>
            )}
            {isFailedLoad && (
              <span className="rounded bg-[#FF5252]/15 border border-[#FF5252]/30 px-1.5 py-0.2 text-[9px] font-semibold text-[#FF5252]">
                Error
              </span>
            )}
          </div>
          <div
            className={`mt-2 text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ${
              isFailedLoad
                ? 'text-[#FF5252]'
                : valuedCount === 0
                ? 'text-[#94A3B8]'
                : totalProfit >= 0
                ? 'text-[#00E676]'
                : 'text-[#FF5252]'
            }`}
          >
            {isFailedLoad ? (
              <span data-testid="portfolio-total-pnl" className="text-[#FF5252] text-xl font-bold font-mono">Unavailable</span>
            ) : valuedCount > 0 ? (
              <AnimatedCounter
                value={Math.abs(totalProfit)}
                prefix={totalProfit >= 0 ? '+$' : '-$'}
                decimals={2}
              />
            ) : (
              <span data-testid="portfolio-total-pnl" className="text-[#94A3B8] text-2xl font-normal">—</span>
            )}
          </div>
          <div className="mt-2 text-xs text-[#94A3B8] font-mono">
            {isFailedLoad ? (
              'Holdings could not be loaded'
            ) : valuedCount > 0 ? (
              <>{totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(2)}% ROI on priced assets</>
            ) : (
              'Awaiting market prices'
            )}
          </div>
        </SpotlightCard>

        {/* Performance Highs & Lows */}
        <SpotlightCard className="p-4 flex flex-col justify-between">
          <div className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8]">
            Performance Leaders
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            {isFailedLoad ? (
              <div data-testid="portfolio-performance-leaders" className="text-xs text-[#FF5252]/80 py-1 font-mono">Positions unavailable</div>
            ) : bestPerformer ? (
              <div className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <img src={bestPerformer.image} className="h-4 w-4 rounded-full object-cover" alt="" />
                  <span className="text-[#94A3B8]">Top:</span>
                  <span className="font-semibold text-[#F0F4F8]">{bestPerformer.symbol.toUpperCase()}</span>
                </div>
                <div className="text-[#00E676] font-mono font-semibold tabular-nums">
                  +{bestPerformer.roi.toFixed(1)}%
                </div>
              </div>
            ) : (
              <div data-testid="portfolio-performance-leaders" className="text-xs text-[#94A3B8] py-1 font-mono">No priced assets to evaluate</div>
            )}
            {!isFailedLoad && worstPerformer && worstPerformer.id !== bestPerformer?.id ? (
              <div className="flex items-center justify-between rounded-lg border border-[#262D38] bg-[#0B0E14] px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <img src={worstPerformer.image} className="h-4 w-4 rounded-full object-cover" alt="" />
                  <span className="text-[#94A3B8]">Lag:</span>
                  <span className="font-semibold text-[#F0F4F8]">{worstPerformer.symbol.toUpperCase()}</span>
                </div>
                <div
                  className={`font-mono font-semibold tabular-nums ${
                    worstPerformer.roi >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'
                  }`}
                >
                  {worstPerformer.roi >= 0 ? '+' : ''}{worstPerformer.roi.toFixed(1)}%
                </div>
              </div>
            ) : null}
          </div>
        </SpotlightCard>
      </div>

      {/* 3. Main Content: Allocation Chart & Holdings Table */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 items-start">
        {/* Allocation Chart Card */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm xl:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Allocation
          </div>
          <p className="text-[11px] text-muted mt-0.5">Distribution across priced positions</p>
          {isFailedLoad ? (
            <div data-testid="portfolio-chart-error" className="flex h-48 flex-col items-center justify-center gap-1.5 text-center p-4">
              <AlertCircle className="h-6 w-6 text-[#FF5252]/70 mb-1" />
              <span className="text-xs font-semibold text-[#F0F4F8]">Chart Unavailable</span>
              <span className="text-[11px] text-[#94A3B8]">Holdings could not be retrieved from database</span>
            </div>
          ) : allocationData.length > 0 ? (
            <>
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => {
                        const num = typeof val === 'number' ? val : Number(val)
                        return [
                          Number.isFinite(num)
                            ? `$${num.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '$0.00',
                          'Value',
                        ]
                      }}
                      contentStyle={{
                        background: 'var(--tooltip-bg, #1B2230)',
                        border: '1px solid var(--tooltip-border, #283140)',
                        borderRadius: '0.5rem',
                        color: 'var(--tooltip-text, #F0F4F8)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {allocationData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted">{item.name}</span>
                    </div>
                    <span className="font-mono text-foreground font-medium tabular-nums">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div data-testid="portfolio-chart-empty" className="flex h-48 items-center justify-center text-xs text-[#94A3B8]">
              No priced assets to chart
            </div>
          )}
        </div>

        {/* Holdings Table Card */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm xl:col-span-3">
          <div className="flex flex-col gap-2.5 border-b border-border bg-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Holdings ({filteredHoldings.length})
            </div>
            <input
              type="text"
              placeholder="Search holdings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {isFailedLoad ? (
            <div data-testid="portfolio-error-state" className="p-8 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-negative/10 border border-negative/30 flex items-center justify-center mb-3">
                {isMissingTable ? (
                  <Database className="h-6 w-6 text-negative" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-negative" />
                )}
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isMissingTable ? 'Database Schema Setup Required' : 'Failed to Load Portfolio'}
              </h3>
              <p className="mt-1 text-xs text-muted max-w-md">
                {isMissingTable
                  ? "The table 'public.holdings' could not be found in the Supabase schema cache. Please apply the repository migration files to initialize your database."
                  : `Could not retrieve your holdings from the database (${error}). Please check your connection or retry.`}
              </p>

              {isMissingTable && (
                <div className="mt-4 p-3.5 rounded-lg border border-border bg-surface-elevated text-left text-xs font-mono text-muted max-w-lg w-full space-y-1.5">
                  <div className="text-accent font-semibold text-[11px] flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> Action Required: Run Migrations in Supabase
                  </div>
                  <div className="text-[11px] text-foreground/90">
                    1. Open your Supabase Dashboard &rarr; <strong>SQL Editor</strong>
                  </div>
                  <div className="text-[11px] text-foreground/90">
                    2. Execute <span className="text-accent">supabase/migrations/20240101000000_initial_schema.sql</span>
                  </div>
                  <div className="text-[11px] text-foreground/90">
                    3. Execute <span className="text-accent">supabase/migrations/20240102000000_phase3_user_persistence.sql</span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => retrySync()}
                  disabled={isLoading}
                  data-testid="portfolio-table-retry-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Retrying...' : 'Retry Connection'}</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Asset</span>
                </button>
              </div>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8 text-[#94A3B8]" />}
              title={holdings.length === 0 ? 'Your portfolio is empty' : 'No holdings match your search'}
              description={
                holdings.length === 0
                  ? 'Add your first asset to start tracking real-time performance and valuation.'
                  : 'Try searching for another asset symbol or clear the search query.'
              }
              action={
                holdings.length === 0 ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
                  >
                    Add your first asset
                  </button>
                ) : (
                  <button
                    onClick={() => setSearch('')}
                    className="text-xs text-[#FFB300] hover:text-[#FFA000] font-medium underline cursor-pointer"
                  >
                    Clear search filter
                  </button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#262D38] bg-[#0B0E14] text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 text-left">Asset</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="hidden py-3 px-3 text-right md:table-cell">Avg Buy</th>
                    <th className="py-3 px-3 text-right">Current Price</th>
                    <th className="hidden py-3 px-3 text-right lg:table-cell">Value</th>
                    <th className="py-3 px-3 text-right">P&amp;L</th>
                    <th className="hidden py-3 px-3 text-right md:table-cell">ROI</th>
                    <th className="py-3 pr-4 pl-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262D38]/50 text-xs">
                  {filteredHoldings.map((holding) => {
                    const isPositive = (holding.profit ?? 0) >= 0
                    return (
                      <tr
                        key={holding.id}
                        className="border-b border-[#262D38]/40 hover:bg-[#1E232E] transition-colors group"
                      >
                        {/* Asset name + symbol */}
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/asset/${holding.coinId}`}
                            className="flex items-center gap-2.5 group-hover:text-[#FFB300] transition-colors"
                          >
                            <img
                              src={holding.image}
                              className="h-6 w-6 rounded-full object-cover shrink-0 bg-[#1E232E]"
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLElement).style.visibility = 'hidden'
                              }}
                            />
                            <div>
                              <div className="font-semibold text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors">
                                {holding.name}
                              </div>
                              <div className="text-[10px] uppercase font-mono text-[#94A3B8]">
                                {holding.symbol}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#F0F4F8]">
                          {holding.quantity}
                        </td>

                        {/* Avg Buy Price */}
                        <td className="hidden py-3.5 px-3 text-right font-mono tabular-nums text-[#94A3B8] md:table-cell">
                          ${holding.avgBuyPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Current price with live/stale/coingecko/unavailable distinction */}
                        <td className="py-3.5 px-3 text-right tabular-nums">
                          {holding.currentPrice !== null ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <span className="font-mono text-[#F0F4F8] font-semibold">
                                ${holding.currentPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              {holding.source === 'binance-live' && (
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-semibold bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30"
                                  title="Real-time WebSocket quote"
                                >
                                  <span className="h-1 w-1 rounded-full bg-[#00E676] animate-pulse" />
                                  Live
                                </span>
                              )}
                              {holding.source === 'binance-stale' && (
                                <span className="rounded px-1.5 py-0.2 text-[9px] font-medium bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/30">
                                  Stale
                                </span>
                              )}
                              {holding.source === 'coingecko' && (
                                <span className="rounded px-1.5 py-0.2 text-[9px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  Sync
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded bg-[#1E232E] px-2 py-0.5 text-[10px] text-[#94A3B8] font-mono">
                              Unavailable
                            </span>
                          )}
                        </td>

                        {/* Valuation */}
                        <td className="hidden py-3.5 px-3 text-right font-mono tabular-nums text-[#F0F4F8] lg:table-cell">
                          {holding.currentValue !== null ? (
                            `$${holding.currentValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>

                        {/* Profit/Loss */}
                        <td className="py-3.5 px-3 text-right font-medium font-mono tabular-nums">
                          {holding.profit !== null ? (
                            <span className={isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'}>
                              {isPositive ? '+' : '-'}${Math.abs(holding.profit).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] font-normal">—</span>
                          )}
                        </td>

                        {/* ROI % */}
                        <td className="hidden py-3.5 px-3 text-right font-medium font-mono tabular-nums md:table-cell">
                          {holding.roi !== null ? (
                            <span className={isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'}>
                              {isPositive ? '+' : ''}{holding.roi.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] font-normal">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-4 pl-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/asset/${holding.coinId}`}
                              className="rounded p-1 text-[#94A3B8] hover:text-[#FFB300] hover:bg-[#1E232E] transition-colors"
                              title="View asset details"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => removeHolding(holding.id)}
                              aria-label={`Remove ${holding.name} from portfolio`}
                              className="rounded p-1 text-[#94A3B8] hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors cursor-pointer"
                              title="Delete position"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
