import { useState } from 'react'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AddAssetModal } from '@/components/portfolio/AddAssetModal'
import { Plus, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#7c3aed', '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#6366f1']

export default function Portfolio() {
  const { holdings, removeHolding } = usePortfolioStore()
  const { prices: livePrices } = useLivePriceStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Calculate portfolio metrics
  const portfolioData = holdings.map(holding => {
    const live = livePrices[holding.symbol]
    const currentPrice = live?.price ?? holding.avgBuyPrice
    const currentValue = holding.quantity * currentPrice
    const costBasis = holding.quantity * holding.avgBuyPrice
    const profit = currentValue - costBasis
    const roi = costBasis > 0 ? (profit / costBasis) * 100 : 0

    return {
      ...holding,
      currentPrice,
      currentValue,
      profit,
      roi,
      change24h: live?.change ?? 0,
    }
  })

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

  // Allocation data for pie chart
  const allocationData = portfolioData.map((h, index) => ({
    name: h.symbol,
    value: h.currentValue,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Portfolio</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Live • Real-time updates from Binance</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-medium text-slate-950 transition-all hover:bg-white/90"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard className="card-sheen">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Total Value</div>
          <div className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
            $<AnimatedCounter value={Math.floor(totalValue)} />
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Today's P&amp;L</div>
          <div className={`mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalProfit >= 0 ? '+' : ''}$<AnimatedCounter value={Math.floor(Math.abs(totalProfit))} />
          </div>
          <div className="mt-2 text-sm text-slate-400">
            {totalROI.toFixed(1)}% ROI
          </div>
        </GlassCard>

        <GlassCard className="card-sheen">
          <div className="mb-4 text-xs uppercase tracking-[0.24em] text-slate-400">Top Performers</div>
          <div className="space-y-4 text-sm">
            {bestPerformer && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div>Best: <span className="font-medium text-white">{bestPerformer.symbol}</span></div>
                <div className="text-emerald-400">+{bestPerformer.roi.toFixed(1)}%</div>
              </div>
            )}
            {worstPerformer && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div>Worst: <span className="font-medium text-white">{worstPerformer.symbol}</span></div>
                <div className="text-rose-400">{worstPerformer.roi.toFixed(1)}%</div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Allocation + Table */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Allocation Chart */}
        <GlassCard className="card-sheen xl:col-span-2">
          <div className="mb-6 text-lg font-semibold tracking-tight">Asset Allocation</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Holdings Table */}
        <GlassCard className="overflow-hidden p-0 xl:col-span-3">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="text-lg font-semibold tracking-tight">Holdings ({filteredHoldings.length})</div>
            <input 
              type="text" 
              placeholder="Search holdings..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 sm:w-60"
            />
          </div>

          {filteredHoldings.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <div className="text-lg font-medium text-slate-300">Your portfolio is empty</div>
              <p className="mt-2 text-sm text-slate-400">Add your first asset to start tracking real-time performance.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-5 rounded-2xl bg-white/5 px-5 py-2 text-sm transition-all hover:bg-white/10"
              >
                Add your first asset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted text-left">
                    <th className="px-8 py-4">Asset</th>
                    <th className="px-4 py-4">Qty</th>
                    <th className="px-4 py-4">Avg Buy</th>
                    <th className="px-4 py-4">Current</th>
                    <th className="px-4 py-4">Value</th>
                    <th className="px-4 py-4">P&amp;L</th>
                    <th className="px-4 py-4">ROI</th>
                    <th className="px-4 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.map((holding) => {
                    const isPositive = holding.profit >= 0
                    return (
                      <tr key={holding.id} className="border-b border-white/5 hover:bg-white/5 group">
                        <td className="px-8 py-4 flex items-center gap-3">
                          <img src={holding.image} className="h-7 w-7 rounded-full" alt="" />
                          <div>
                            <div className="font-medium">{holding.name}</div>
                            <div className="text-xs text-muted">{holding.symbol}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono tabular-nums">{holding.quantity}</td>
                        <td className="px-4 py-4 font-mono tabular-nums">${holding.avgBuyPrice}</td>
                        <td className="px-4 py-4 font-mono tabular-nums">${holding.currentPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 font-mono tabular-nums">${holding.currentValue.toFixed(0)}</td>
                        <td className={`px-4 py-4 font-medium tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
                          {isPositive ? '+' : ''}${holding.profit.toFixed(0)}
                        </td>
                        <td className={`px-4 py-4 font-medium tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
                          {holding.roi.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4">
                          <button onClick={() => removeHolding(holding.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
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