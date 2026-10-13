import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useMarketData, useCoinsMarketData, type CoinMarketData } from '@/services/coingecko'
import { computePortfolioValuation } from '@/services/priceResolver'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AddAssetModal } from '@/components/portfolio/AddAssetModal'
import { Plus, Trash2, ChevronRight, AlertTriangle, Radio } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#7c3aed', '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9', '#ec4899']

export default function Portfolio() {
  const { holdings, removeHolding } = usePortfolioStore()
  const { prices: livePrices, connectionStatus } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">Portfolio</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 sm:text-base">
            <Radio className={`h-4 w-4 ${connectionStatus === 'connected' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>Feed: {connectionStatus === 'connected' ? 'Live Binance' : connectionStatus === 'reconnecting' ? 'Reconnecting feed' : 'Offline / Polling'}</span>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      {/* Incomplete valuation warning banner */}
      {isIncomplete && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Incomplete Valuation Notice: </span>
            {missingCount} of {portfolioData.length} asset{missingCount > 1 ? 's' : ''} currently lack active market prices.
            Portfolio totals reflect only assets with verified price feeds. Unpriced assets are not assumed to equal buy prices.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="card-sheen">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
            <span>Total Value</span>
            {isIncomplete && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Partial
              </span>
            )}
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-5xl">
            {valuedCount > 0 ? (
              <AnimatedCounter value={totalValue} prefix="$" decimals={2} />
            ) : (
              <span className="text-slate-400 text-3xl font-normal">—</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {isIncomplete
              ? `${valuedCount} of ${portfolioData.length} holdings priced`
              : `${portfolioData.length} asset${portfolioData.length === 1 ? '' : 's'} tracked`}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
            <span>Total P&amp;L</span>
            {isIncomplete && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Priced Only
              </span>
            )}
          </div>
          <div className={`mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl ${
            valuedCount === 0
              ? 'text-slate-400'
              : totalProfit >= 0
              ? 'text-emerald-600'
              : 'text-rose-500'
          }`}>
            {valuedCount > 0 ? (
              <AnimatedCounter
                value={Math.abs(totalProfit)}
                prefix={totalProfit >= 0 ? '+$' : '-$'}
                decimals={2}
              />
            ) : (
              <span className="text-slate-400 text-3xl font-normal">—</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {valuedCount > 0 ? (
              <>{totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(2)}% ROI on priced assets</>
            ) : (
              'Awaiting market prices'
            )}
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 text-xs uppercase tracking-[0.24em] text-slate-500">Performance</div>
          <div className="space-y-3 text-sm">
            {bestPerformer ? (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <img src={bestPerformer.image} className="h-5 w-5 rounded-full" alt="" />
                  <span className="text-slate-500">Best:</span> <span className="font-medium text-slate-900 dark:text-white">{bestPerformer.symbol.toUpperCase()}</span>
                </div>
                <div className="text-emerald-600 font-mono">+{bestPerformer.roi.toFixed(1)}%</div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-1">No priced assets to evaluate</div>
            )}
            {worstPerformer && worstPerformer.id !== bestPerformer?.id && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <img src={worstPerformer.image} className="h-5 w-5 rounded-full" alt="" />
                  <span className="text-slate-500">Lagging:</span> <span className="font-medium text-slate-900 dark:text-white">{worstPerformer.symbol.toUpperCase()}</span>
                </div>
                <div className={`font-mono ${worstPerformer.roi >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {worstPerformer.roi >= 0 ? '+' : ''}{worstPerformer.roi.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Allocation chart */}
        <GlassCard className="xl:col-span-1">
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Allocation</div>
          <div className="text-xs text-slate-500">Distribution across verified positions</div>
          {allocationData.length > 0 ? (
            <>
              <div className="h-52 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={3} dataKey="value">
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => {
                        const num = typeof val === 'number' ? val : Number(val)
                        return [
                          Number.isFinite(num)
                            ? `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '$0.00',
                          'Value',
                        ]
                      }}
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {allocationData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-900 dark:text-white font-medium">{item.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-56 items-center justify-center text-xs text-slate-400">
              No priced assets to chart
            </div>
          )}
        </GlassCard>

        {/* Holdings table */}
        <GlassCard className="overflow-hidden p-0 xl:col-span-3">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 dark:border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Holdings ({filteredHoldings.length})</div>
            <input
              type="text"
              placeholder="Search holdings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 sm:w-60 focus:outline-none focus:border-violet-400"
            />
          </div>

          {filteredHoldings.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <div className="text-lg font-medium text-slate-900 dark:text-white">Your portfolio is empty</div>
              <p className="mt-2 text-sm text-slate-500">Add your first asset to start tracking real-time performance.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-5 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-950 px-5 py-2 text-sm text-white transition-all hover:bg-slate-800 cursor-pointer"
              >
                Add your first asset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-3">Asset</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="hidden px-4 py-3 md:table-cell">Avg Buy</th>
                    <th className="px-4 py-3">Current Price</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Value</th>
                    <th className="px-4 py-3">P&amp;L</th>
                    <th className="hidden px-4 py-3 md:table-cell">ROI</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((holding) => {
                    const isPositive = (holding.profit ?? 0) >= 0
                    return (
                      <tr key={holding.id} className="group border-b border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-6 py-3">
                          <Link to={`/asset/${holding.coinId}`} className="flex items-center gap-3">
                            <img src={holding.image} className="h-7 w-7 rounded-full" alt="" />
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{holding.name}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-400">{holding.symbol}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">{holding.quantity}</td>
                        <td className="hidden px-4 py-3 font-mono tabular-nums text-slate-500 md:table-cell">
                          ${holding.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* Current price with live/stale/coingecko/unavailable distinction */}
                        <td className="px-4 py-3 tabular-nums">
                          {holding.currentPrice !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-900 dark:text-slate-100">
                                ${holding.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {holding.source === 'binance-live' && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                              {holding.source === 'binance-stale' && (
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  Stale
                                </span>
                              )}
                              {holding.source === 'coingecko' && (
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  CoinGecko
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Unavailable
                            </span>
                          )}
                        </td>

                        {/* Value */}
                        <td className="hidden px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300 lg:table-cell">
                          {holding.currentValue !== null ? (
                            `$${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* P&L */}
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {holding.profit !== null ? (
                            <span className={isPositive ? 'text-emerald-600' : 'text-rose-500'}>
                              {isPositive ? '+' : '-'}${Math.abs(holding.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        {/* ROI */}
                        <td className="hidden px-4 py-3 font-medium tabular-nums md:table-cell">
                          {holding.roi !== null ? (
                            <span className={isPositive ? 'text-emerald-600' : 'text-rose-500'}>
                              {isPositive ? '+' : ''}{holding.roi.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link to={`/asset/${holding.coinId}`} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                            <button onClick={() => removeHolding(holding.id)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
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
        </GlassCard>
      </div>

      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
