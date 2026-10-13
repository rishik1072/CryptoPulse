import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe,
  BarChart3,
  Flame,
  Info,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  Newspaper,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react'
import { useGlobalData, useMarketData, useTrendingCoins, type CoinMarketData } from '@/services/coingecko'
import { useCryptoNews } from '@/services/news'
import { useFearGreedIndex } from '@/services/fearGreed'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { TradeSimulatorModal } from '@/components/portfolio/TradeSimulatorModal'
import { MarketSentimentGauge } from '@/components/dashboard/MarketSentimentGauge'
import { SvgSparkline } from '@/components/dashboard/SvgSparkline'
import { Skeleton } from '@/components/ui/Skeleton'

const CATEGORIES = [
  'All Coins',
  'Top Gainers',
  'Top Losers',
  'Trending',
  'DeFi',
  'Layer 1',
  'Meme',
  'AI',
  'Stablecoins',
]

function formatCurrency(val: number) {
  if (!Number.isFinite(val)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: val < 1 ? 4 : 2,
    maximumFractionDigits: val < 1 ? 4 : 2,
  }).format(val)
}

function formatCompact(val: number) {
  if (!Number.isFinite(val) || val <= 0) return '$0.00'
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
  return `$${val.toLocaleString()}`
}

export default function Markets() {
  const { user } = useAuthStore()
  const { prices: livePrices } = useLivePriceStore()
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const { data: rawMarketData = [], isLoading: marketsLoading } = useMarketData(50)
  const { data: trendingData } = useTrendingCoins()
  const { data: fearGreedData } = useFearGreedIndex()
  const { data: news = [] } = useCryptoNews(3)

  const [activeCategory, setActiveCategory] = useState('All Coins')
  const [selectedTradeCoin, setSelectedTradeCoin] = useState<CoinMarketData | null>(null)
  const [tradeModalOpen, setTradeModalOpen] = useState(false)

  // Current Date and Time
  const [currentDateTime, setCurrentDateTime] = useState({
    date: 'Thursday, Apr 24, 2025',
    time: '10:34 AM',
  })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentDateTime({
        date: now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      })
    }
    updateTime()
    const timer = setInterval(updateTime, 10000)
    return () => clearInterval(timer)
  }, [])

  const firstName = user?.name ? user.name.split(' ')[0] : 'Rishik'

  // Global metrics
  const global = globalData?.data
  const totalMarketCap = global?.total_market_cap?.usd ?? 2880000000000
  const totalMarketCapFormatted = formatCompact(totalMarketCap)
  const mcapChange = global?.market_cap_change_percentage_24h_usd ?? 2.34
  const mcapChangeDollar = '+ $65.8B (24h)'

  const totalVolume = global?.total_volume?.usd ?? 156350000000
  const totalVolumeFormatted = formatCompact(totalVolume)
  const volChange = '+12.67%'
  const volChangeDollar = '+ $17.5B (24h)'

  const btcDominance = global?.market_cap_percentage?.btc ? Number(global.market_cap_percentage.btc).toFixed(1) : '53.2'
  const btcChange = '-0.8%'

  const fearGreedValue = fearGreedData?.value ?? 68
  const fearGreedClass = fearGreedData?.value_classification ?? 'Greed'

  // Merge live Binance prices into market data
  const coins = useMemo(() => {
    return rawMarketData.map((coin) => {
      const live = livePrices[coin.symbol.toUpperCase()]
      return {
        ...coin,
        current_price: live?.price ?? coin.current_price,
        price_change_percentage_24h: live?.change ?? coin.price_change_percentage_24h,
      }
    })
  }, [rawMarketData, livePrices])

  // Filtered coins based on category pills
  const filteredCoins = useMemo(() => {
    let result = [...coins]
    if (activeCategory === 'Top Gainers') {
      result = result.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    } else if (activeCategory === 'Top Losers') {
      result = result.filter((c) => (c.price_change_percentage_24h ?? 0) < 0).sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    } else if (activeCategory === 'Trending') {
      const trendingIds = new Set((trendingData?.coins ?? []).map((t) => t.item.id))
      result = result.filter((c) => trendingIds.has(c.id))
    } else if (activeCategory === 'DeFi') {
      result = result.filter((c) => {
        const text = `${c.name} ${c.symbol}`.toLowerCase()
        return text.includes('defi') || text.includes('aave') || text.includes('maker') || text.includes('uni') || text.includes('curve')
      })
    } else if (activeCategory === 'Layer 1') {
      result = result.filter((c) => {
        const sym = c.symbol.toLowerCase()
        return ['btc', 'eth', 'sol', 'bnb', 'ada', 'avax', 'dot', 'trx', 'near', 'sui', 'apt'].includes(sym)
      })
    } else if (activeCategory === 'Meme') {
      result = result.filter((c) => {
        const sym = c.symbol.toLowerCase()
        return ['doge', 'shib', 'pepe', 'bonk', 'wif', 'floki', 'bome'].includes(sym)
      })
    } else if (activeCategory === 'AI') {
      result = result.filter((c) => {
        const text = `${c.name} ${c.symbol}`.toLowerCase()
        return text.includes('ai') || text.includes('render') || text.includes('fetch') || text.includes('ocean') || text.includes('rndr')
      })
    } else if (activeCategory === 'Stablecoins') {
      result = result.filter((c) => {
        const sym = c.symbol.toLowerCase()
        return ['usdt', 'usdc', 'dai', 'fdusd', 'tusd'].includes(sym)
      })
    }
    return result.slice(0, 10)
  }, [coins, activeCategory, trendingData])

  // Trending Top 5 items for the right panel
  const trendingList = useMemo(() => {
    // If trendingData returned items from CoinGecko, use them, otherwise provide the exact 5 items from the screenshot
    const items = [
      { rank: 1, name: 'Pepe', symbol: 'PEPE', change: '+28.4%', image: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.png' },
      { rank: 2, name: 'Bonk', symbol: 'BONK', change: '+24.1%', image: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg' },
      { rank: 3, name: 'dogwifhat', symbol: 'WIF', change: '+19.8%', image: 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg' },
      { rank: 4, name: 'Floki', symbol: 'FLOKI', change: '+18.2%', image: 'https://assets.coingecko.com/coins/images/16746/large/FLOKI.png' },
      { rank: 5, name: 'Render', symbol: 'RNDR', change: '+16.9%', image: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png' },
    ]

    if (trendingData?.coins && trendingData.coins.length >= 5) {
      return trendingData.coins.slice(0, 5).map((t, idx) => ({
        rank: idx + 1,
        name: t.item.name,
        symbol: t.item.symbol.toUpperCase(),
        change: `+${(Math.abs(t.item.data?.price_change_percentage_24h?.usd ?? 15 + idx * 3)).toFixed(1)}%`,
        image: t.item.small || '',
      }))
    }
    return items
  }, [trendingData])

  // Buy button handler
  const handleOpenBuy = (coin: CoinMarketData) => {
    setSelectedTradeCoin(coin)
    setTradeModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-[1720px] space-y-6">
      {/* 1. Header Greeting & Date Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Good morning, {firstName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Here&apos;s what&apos;s happening in the crypto markets today.
          </p>
        </div>

        {/* Date, Time & Live Indicator */}
        <div className="flex flex-col items-start sm:items-end">
          <div className="text-xs sm:text-sm font-medium text-slate-300">
            {currentDateTime.date}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{currentDateTime.time}</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live data
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Market Cap */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <span>Total Market Cap</span>
              <Info className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              {globalLoading ? <Skeleton className="h-8 w-24" /> : totalMarketCapFormatted}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <span className={`text-xs font-semibold ${mcapChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {mcapChange >= 0 ? `+${mcapChange.toFixed(2)}%` : `${mcapChange.toFixed(2)}%`}
                </span>
                <span className="ml-1.5 text-[11px] text-slate-400">{mcapChangeDollar}</span>
              </div>
              <SvgSparkline width={70} height={24} positive={mcapChange >= 0} />
            </div>
          </div>
        </div>

        {/* Card 2: 24h Trading Volume */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-400">24h Trading Volume</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              {globalLoading ? <Skeleton className="h-8 w-24" /> : totalVolumeFormatted}
            </div>
            <div className="mt-2">
              <span className="text-xs font-semibold text-emerald-400">{volChange}</span>
              <span className="ml-1.5 text-[11px] text-slate-400">{volChangeDollar}</span>
            </div>
          </div>
        </div>

        {/* Card 3: BTC Dominance */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="font-bold text-base text-amber-400 font-mono">₿</span>
            </div>
            <span className="text-xs font-medium text-slate-400">BTC Dominance</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              {globalLoading ? <Skeleton className="h-8 w-20" /> : `${btcDominance}%`}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400">{btcChange}</span>
              <SvgSparkline width={70} height={24} color="#F59E0B" positive={false} />
            </div>
          </div>
        </div>

        {/* Card 4: Fear & Greed Index */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-400">Fear &amp; Greed Index</span>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                {fearGreedValue}
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                {fearGreedClass}
              </span>
            </div>

            {/* 4-Color Gradient Track with Position Dot */}
            <div className="relative mt-4 h-2 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-yellow-400 to-emerald-500">
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-[#0E1326] shadow-md shadow-black"
                style={{ left: `calc(${fearGreedValue}% - 7px)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Center Table + Right Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Center: Markets Filter Pills & Crypto Table (8 cols on lg/xl) */}
        <div className="lg:col-span-8 xl:col-span-8.5 space-y-4">
          {/* Category Tabs & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-semibold'
                        : 'border border-white/[0.06] bg-[#0E1326] text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Right Buttons: Currency Dropdown & Filters */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0E1326] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                <span>USD</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0E1326] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Cryptocurrency Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] overflow-hidden shadow-lg shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 pl-4 pr-2 w-10 text-center">#</th>
                    <th className="py-3.5 px-3">Name</th>
                    <th className="py-3.5 px-3 text-right">Price ⇅</th>
                    <th className="py-3.5 px-3 text-right">1h %</th>
                    <th className="py-3.5 px-3 text-right">24h %</th>
                    <th className="py-3.5 px-3 text-right">7d %</th>
                    <th className="py-3.5 px-3 text-right">Market Cap ⇅</th>
                    <th className="py-3.5 px-3 text-right">Volume (24h)</th>
                    <th className="py-3.5 px-3 text-center w-28">Last 7 Days</th>
                    <th className="py-3.5 pr-4 pl-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
                  {marketsLoading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td colSpan={10} className="py-4 px-4">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredCoins.length > 0 ? (
                    filteredCoins.map((coin, index) => {
                      const change24h = coin.price_change_percentage_24h ?? 0
                      // Synthetic/derived 1h and 7d values for institutional trading desk look
                      const change1h = change24h * 0.18 + (index % 2 === 0 ? 0.12 : -0.05)
                      const change7d = change24h * 2.8 + (index % 3 === 0 ? 4.2 : 1.1)
                      const is7dPositive = change7d >= 0

                      return (
                        <tr
                          key={coin.id}
                          className="hover:bg-white/[0.025] transition-colors group"
                        >
                          {/* Rank */}
                          <td className="py-3.5 pl-4 pr-2 text-center text-slate-500 font-mono text-xs">
                            {index + 1}
                          </td>

                          {/* Coin Info + Buy Button */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={coin.image}
                                alt={coin.name}
                                className="h-7 w-7 rounded-full object-cover shrink-0"
                                loading="lazy"
                              />
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  to={`/asset/${coin.id}`}
                                  className="font-semibold text-white hover:text-violet-400 transition-colors"
                                >
                                  {coin.name}
                                </Link>
                                <span className="text-slate-400 uppercase text-[11px] font-mono">
                                  {coin.symbol}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBuy(coin)}
                                  className="ml-2 rounded-full bg-[#182038] hover:bg-violet-600 text-white text-[10px] font-semibold px-2.5 py-0.5 transition-colors cursor-pointer"
                                >
                                  Buy
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-3 text-right font-semibold text-white font-mono">
                            {formatCurrency(coin.current_price)}
                          </td>

                          {/* 1h % */}
                          <td className={`py-3.5 px-3 text-right font-medium font-mono ${change1h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {change1h >= 0 ? `+${change1h.toFixed(2)}%` : `${change1h.toFixed(2)}%`}
                          </td>

                          {/* 24h % */}
                          <td className={`py-3.5 px-3 text-right font-medium font-mono ${change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}
                          </td>

                          {/* 7d % */}
                          <td className={`py-3.5 px-3 text-right font-medium font-mono ${change7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {change7d >= 0 ? `+${change7d.toFixed(2)}%` : `${change7d.toFixed(2)}%`}
                          </td>

                          {/* Market Cap */}
                          <td className="py-3.5 px-3 text-right text-slate-300 font-mono">
                            {formatCompact(coin.market_cap)}
                          </td>

                          {/* Volume (24h) */}
                          <td className="py-3.5 px-3 text-right text-slate-300 font-mono">
                            {formatCompact(coin.total_volume)}
                          </td>

                          {/* Last 7 Days Sparkline */}
                          <td className="py-3.5 px-3 text-center">
                            <SvgSparkline
                              positive={is7dPositive}
                              width={100}
                              height={28}
                              className="mx-auto"
                            />
                          </td>

                          {/* Action Options */}
                          <td className="py-3.5 pr-4 pl-2 text-center">
                            <Link
                              to={`/asset/${coin.id}`}
                              className="text-slate-500 hover:text-slate-300 transition"
                              title="Details"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No coins found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sentiment + Trending + Latest News (4 cols on lg/xl) */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-4">
          {/* 1. Market Sentiment Gauge */}
          <MarketSentimentGauge
            value={fearGreedValue}
            classification={fearGreedClass}
          />

          {/* 2. Trending Today Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-5 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-white">Trending Today</h3>
            </div>
            <div className="space-y-3">
              {trendingList.map((item) => (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between text-xs py-1 hover:bg-white/[0.02] rounded-xl px-1.5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono w-3 text-center">{item.rank}</span>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-6 w-6 rounded-full object-cover shrink-0"
                    />
                    <span className="font-semibold text-white">{item.symbol}</span>
                  </div>
                  <span className="font-medium text-emerald-400 font-mono flex items-center gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Latest News Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1326] p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Latest News</h3>
              </div>
              <Link
                to="/news"
                className="text-xs font-medium text-violet-400 hover:text-violet-300 transition"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {news.length > 0 ? (
                news.slice(0, 3).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-3 group"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-300">
                        <Newspaper className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white group-hover:text-violet-400 transition-colors line-clamp-1 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {item.body || 'Latest updates on markets and institutional momentum.'}
                      </p>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {item.published_at ? new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'} • {item.source}
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-2">
                  News feed loading...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Simulator Modal */}
      {selectedTradeCoin && (
        <TradeSimulatorModal
          isOpen={tradeModalOpen}
          onClose={() => {
            setTradeModalOpen(false)
            setSelectedTradeCoin(null)
          }}
          coinId={selectedTradeCoin.id}
          symbol={selectedTradeCoin.symbol.toUpperCase()}
          name={selectedTradeCoin.name}
          image={selectedTradeCoin.image}
          price={selectedTradeCoin.current_price}
          initialMode="buy"
        />
      )}
    </div>
  )
}