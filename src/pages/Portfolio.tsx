import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AddAssetModal } from '@/components/portfolio/AddAssetModal'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#7c3aed', '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9', '#ec4899']

export default function Portfolio() {
  const { holdings, removeHolding } = usePortfolioStore()
  const { prices: livePrices } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const portfolioData = useMemo(() => holdings.map(holding => {
    const live = livePrices[holding.symbol]
    const currentPrice = live?.price ?? holding.avgBuyPrice
    const currentValue = holding.quantity * currentPrice
    const costBasis = holding.quantity * holding.avgBuyPrice
    const profit = currentValue - costBasis
    const roi = costBasis > 0 ? (profit / costBasis) * 100 : 0
    return { ...holding, currentPrice, currentValue, profit, roi, change24h: live?.change ?? 0 }
  }), [holdings, livePrices])

  const filteredHoldings = portfolioData.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.symbol.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = portfolioData.reduce((sum, h) => sum + h.currentValue, 0)
  const totalCost = portfolioData.reduce((sum, h) => sum + h.quantity * h.avgBuyPrice, 0)
  const totalProfit = totalValue - totalCost
  const totalROI = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  const bestPerformer = [...portfolioData].sort((a, b) => b.roi - a.roi)[0]
  const worstPerformer = [...portfolioData].sort((a, b) => a.roi - b.roi)[0]

  const allocationData = portfolioData.map((h, index) => ({
    name: h.symbol.toUpperCase(),
    value: h.currentValue,
    color: COLORS[index % COLORS.length],
    pct: totalValue > 0 ? (h.currentValue / totalValue * 100) : 0,
    image: h.image,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">Portfolio</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Live • Real-time updates from Binance</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="card-sheen">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Value</div>
          <div className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-5xl">
            $<AnimatedCounter value={Math.floor(totalValue)} />
          </div>
          <div className="mt-2 text-xs text-slate-400">{portfolioData.length} assets tracked</div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Total P&amp;L</div>
          <div className={`mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {totalProfit >= 0 ? '+' : ''}$<AnimatedCounter value={Math.floor(Math.abs(totalProfit))} />
          </div>
          <div className="mt-2 text-xs text-slate-400">{totalROI >= 0 ? '+' : ''}{totalROI.toFixed(2)}% ROI since inception</div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 text-xs uppercase tracking-[0.24em] text-slate-500">Performance</div>
          <div className="space-y-3 text-sm">
            {bestPerformer && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <img src={bestPerformer.image} className="h-5 w-5 rounded-full" alt="" />
                  <span className="text-slate-500">Best:</span> <span className="font-medium text-slate-900 dark:text-white">{bestPerformer.symbol.toUpperCase()}</span>
                </div>
                <div className="text-emerald-600">+{bestPerformer.roi.toFixed(1)}%</div>
              </div>
            )}
            {worstPerformer && worstPerformer.id !== bestPerformer?.id && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <img src={worstPerformer.image} className="h-5 w-5 rounded-full" alt="" />
                  <span className="text-slate-500">Worst:</span> <span className="font-medium text-slate-900 dark:text-white">{worstPerformer.symbol.toUpperCase()}</span>
                </div>
                <div className="text-rose-500">{worstPerformer.roi.toFixed(1)}%</div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Allocation + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Allocation Chart with legend */}
        <GlassCard className="card-sheen xl:col-span-2">
          <div className="mb-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Asset Allocation</div>
          {allocationData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">No holdings yet</div>
          ) : (
            <>
              <div className="relative h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={105}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xs text-slate-400 uppercase tracking-widest">Total</div>
                  <div className="text-xl font-semibold text-slate-900 dark:text-white">${totalValue.toFixed(0)}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {allocationData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                      <img src={entry.image} alt="" className="h-4 w-4 rounded-full" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{entry.name}</span>
                    </div>
                    <div className="flex gap-3 text-right">
                      <span className="text-slate-500">{entry.pct.toFixed(1)}%</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">${entry.value.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        {/* Holdings Table */}
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
                className="mt-5 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-950 px-5 py-2 text-sm text-white transition-all hover:bg-slate-800"
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
                    <th className="px-4 py-3">Current</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Value</th>
                    <th className="px-4 py-3">P&amp;L</th>
                    <th className="hidden px-4 py-3 md:table-cell">ROI</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((holding) => {
                    const isPositive = holding.profit >= 0
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
                        <td className="hidden px-4 py-3 font-mono tabular-nums text-slate-500 md:table-cell">${holding.avgBuyPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">${holding.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="hidden px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300 lg:table-cell">${holding.currentValue.toFixed(0)}</td>
                        <td className={`px-4 py-3 font-medium tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isPositive ? '+' : ''}${holding.profit.toFixed(0)}
                        </td>
                        <td className={`hidden px-4 py-3 font-medium tabular-nums md:table-cell ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {holding.roi.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link to={`/asset/${holding.coinId}`} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                            <button onClick={() => removeHolding(holding.id)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800">
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
