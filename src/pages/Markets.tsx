import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  BarChart3,
  Activity,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  useGlobalData,
  useMarketData,
  useTrendingCoins,
  type CoinMarketData,
} from '@/services/coingecko'
import { useFearGreedIndex } from '@/services/fearGreed'
import { useLivePriceStore } from '@/store/useLivePriceStore'
import { TradeSimulatorModal } from '@/components/portfolio/TradeSimulatorModal'
import { SvgSparkline } from '@/components/dashboard/SvgSparkline'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'

const CATEGORIES = [
  'All Coins',
  'Top Gainers',
  'Top Losers',
  'Trending',
  'Layer 1',
  'DeFi',
  'AI',
  'Meme',
  'Stablecoins',
] as const

type CategoryType = (typeof CATEGORIES)[number]
type SortField = 'rank' | 'name' | 'price' | 'change24h' | 'volume' | 'market_cap'
type SortDirection = 'asc' | 'desc'

function formatCurrency(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—'
  if (val < 0.0001) {
    return `$${val.toFixed(8)}`
  }
  if (val < 1) {
    return `$${val.toFixed(4)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

function formatCompact(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val) || val <= 0) return '—'
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`
  return `$${val.toLocaleString()}`
}

function getSentimentBadgeColor(val: number | null | undefined): string {
  if (val == null) return 'bg-[#1E232E] text-[#94A3B8] border-[#262D38]'
  if (val >= 55) return 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
  if (val >= 45) return 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/30'
  return 'bg-[#FF5252]/15 text-[#FF5252] border-[#FF5252]/30'
}

interface EnrichedCoin extends CoinMarketData {
  market_cap_rank: number
  isLiveStreamed: boolean
  sparkline_in_7d?: {
    price: number[]
  }
}

export default function Markets() {
  const navigate = useNavigate()
  const { prices: livePrices } = useLivePriceStore()
  const { data: globalData, isLoading: globalLoading } = useGlobalData()
  const {
    data: rawMarketData = [],
    isLoading: marketsLoading,
    isError: marketsError,
    error: marketsErrorMessage,
    refetch: refetchMarkets,
  } = useMarketData(50)
  const { data: trendingData } = useTrendingCoins()
  const { data: fearGreedData } = useFearGreedIndex()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryType>('All Coins')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedTradeCoin, setSelectedTradeCoin] = useState<CoinMarketData | null>(null)
  const [tradeModalOpen, setTradeModalOpen] = useState(false)

  // Global metrics derived truthfully from CoinGecko global endpoint
  const global = globalData?.data
  const totalMarketCap = global?.total_market_cap?.usd
  const totalMarketCapFormatted = formatCompact(totalMarketCap)
  const totalMarketCapExact = totalMarketCap != null ? `$${totalMarketCap.toLocaleString()}` : undefined
  const mcapChange = global?.market_cap_change_percentage_24h_usd

  const totalVolume = global?.total_volume?.usd
  const totalVolumeFormatted = formatCompact(totalVolume)
  const totalVolumeExact = totalVolume != null ? `$${totalVolume.toLocaleString()}` : undefined

  const btcDominance = global?.market_cap_percentage?.btc
  const btcDominanceFormatted = btcDominance != null ? `${Number(btcDominance).toFixed(1)}%` : '—'
  const ethDominance = global?.market_cap_percentage?.eth
  const ethDominanceFormatted = ethDominance != null ? `${Number(ethDominance).toFixed(1)}%` : null

  // Merge live Binance prices into market data while recording honest streaming provenance
  const coins: EnrichedCoin[] = useMemo(() => {
    return rawMarketData.map((coin, index) => {
      const live = livePrices[coin.symbol.toUpperCase()]
      const isLiveStreamed = live?.price != null
      return {
        ...coin,
        market_cap_rank: index + 1,
        current_price: live?.price ?? coin.current_price,
        price_change_percentage_24h: live?.change ?? coin.price_change_percentage_24h,
        isLiveStreamed,
      }
    })
  }, [rawMarketData, livePrices])

  // Filtered coins based on category
  const categoryFiltered = useMemo(() => {
    let result = [...coins]

    switch (activeCategory) {
      case 'Top Gainers':
        result = result
          .filter((c) => (c.price_change_percentage_24h ?? 0) > 0)
          .sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0))
        break
      case 'Top Losers':
        result = result
          .filter((c) => (c.price_change_percentage_24h ?? 0) < 0)
          .sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0))
        break
      case 'Trending': {
        const trendingIds = new Set((trendingData?.coins ?? []).map((t) => t.item.id))
        result = result.filter((c) => trendingIds.has(c.id))
        break
      }
      case 'Layer 1': {
        const l1Symbols = new Set(['btc', 'eth', 'sol', 'bnb', 'ada', 'avax', 'dot', 'trx', 'near', 'sui', 'apt'])
        result = result.filter((c) => l1Symbols.has(c.symbol.toLowerCase()))
        break
      }
      case 'DeFi': {
        const defiKeywords = ['defi', 'aave', 'maker', 'uni', 'curve', 'link', 'lido', 'crv', 'mkr', 'snx', 'comp']
        result = result.filter((c) => {
          const text = `${c.name} ${c.symbol}`.toLowerCase()
          return defiKeywords.some((kw) => text.includes(kw))
        })
        break
      }
      case 'AI': {
        const aiKeywords = ['ai', 'render', 'fetch', 'ocean', 'rndr', 'tao', 'fet']
        result = result.filter((c) => {
          const text = `${c.name} ${c.symbol}`.toLowerCase()
          return aiKeywords.some((kw) => text.includes(kw))
        })
        break
      }
      case 'Meme': {
        const memeSymbols = new Set(['doge', 'shib', 'pepe', 'bonk', 'wif', 'floki', 'bome', 'brett', 'popcat'])
        result = result.filter((c) => memeSymbols.has(c.symbol.toLowerCase()))
        break
      }
      case 'Stablecoins': {
        const stableSymbols = new Set(['usdt', 'usdc', 'dai', 'fdusd', 'tusd', 'usde', 'pyusd'])
        result = result.filter((c) => stableSymbols.has(c.symbol.toLowerCase()))
        break
      }
      default:
        // 'All Coins' — retain all
        break
    }

    return result
  }, [coins, activeCategory, trendingData])

  // Sorting
  const sortedCoins = useMemo(() => {
    return [...categoryFiltered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'rank':
          comparison = a.market_cap_rank - b.market_cap_rank
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = (a.current_price ?? 0) - (b.current_price ?? 0)
          break
        case 'change24h':
          comparison = (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0)
          break
        case 'volume':
          comparison = (a.total_volume ?? 0) - (b.total_volume ?? 0)
          break
        case 'market_cap':
          comparison = (a.market_cap ?? 0) - (b.market_cap ?? 0)
          break
        default:
          comparison = 0
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [categoryFiltered, sortField, sortDirection])

  // Search filtering
  const displayedCoins = useMemo(() => {
    if (!searchQuery.trim()) return sortedCoins
    const q = searchQuery.toLowerCase().trim()
    return sortedCoins.filter(
      (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    )
  }, [sortedCoins, searchQuery])

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      // Rank and name default to ascending; numeric financial metrics default to descending
      setSortDirection(field === 'rank' || field === 'name' ? 'asc' : 'desc')
    }
  }

  // Open trade modal
  const handleOpenBuy = (coin: CoinMarketData) => {
    setSelectedTradeCoin(coin)
    setTradeModalOpen(true)
  }

  const renderSortHeader = (
    field: SortField,
    label: string,
    align: 'left' | 'right' | 'center' = 'right',
    className = ''
  ) => {
    const isSorted = sortField === field
    return (
      <th
        scope="col"
        className={`py-3 px-3 text-[11px] font-semibold uppercase tracking-wider select-none text-${align} ${className}`}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`inline-flex items-center gap-1 hover:text-[#F0F4F8] transition-colors focus-visible:outline-none focus-visible:text-[#FFB300] ${
            isSorted ? 'text-[#FFB300] font-bold' : 'text-[#94A3B8]'
          } ${align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : ''}`}
          aria-label={`Sort by ${label} ${
            isSorted ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''
          }`}
        >
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3 shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40 hover:opacity-100" />
          )}
        </button>
      </th>
    )
  }

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Page Header with aligned search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Cryptocurrency Markets
            </h1>
            <span className="text-[11px] font-medium font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-full tabular-nums">
              {coins.length} Assets
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Real-time quotes, 24-hour volume, and market capitalization intelligence.
          </p>
        </div>

        {/* Asset search aligned with heading */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search asset or symbol..."
            aria-label="Search cryptocurrencies"
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-elevated border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F0F4F8] p-0.5"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Market Metrics strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Market Cap */}
        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Total Market Cap</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20">
              <Globe className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className="text-lg sm:text-xl font-bold tracking-tight text-[#F0F4F8] font-mono tabular-nums truncate"
              title={totalMarketCapExact}
            >
              {globalLoading ? <Skeleton className="h-6 w-24" /> : totalMarketCapFormatted}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {globalLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : mcapChange != null ? (
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    mcapChange >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'
                  }`}
                >
                  {mcapChange >= 0 ? `+${mcapChange.toFixed(2)}%` : `${mcapChange.toFixed(2)}%`}
                </span>
              ) : (
                <span className="text-[#94A3B8] font-mono">—</span>
              )}
              <span className="text-[11px] text-[#94A3B8]">24h change</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Metric 2: 24h Trading Volume */}
        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">24h Trading Volume</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className="text-lg sm:text-xl font-bold tracking-tight text-[#F0F4F8] font-mono tabular-nums truncate"
              title={totalVolumeExact}
            >
              {globalLoading ? <Skeleton className="h-6 w-24" /> : totalVolumeFormatted}
            </div>
            <div className="mt-1 text-[11px] text-[#94A3B8]">
              Global exchange liquidity
            </div>
          </div>
        </SpotlightCard>

        {/* Metric 3: BTC Dominance */}
        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">BTC Dominance</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20">
              <span className="font-bold text-xs font-mono">₿</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold tracking-tight text-[#F0F4F8] font-mono tabular-nums truncate">
              {globalLoading ? <Skeleton className="h-6 w-20" /> : btcDominanceFormatted}
            </div>
            <div className="mt-1 text-[11px] text-[#94A3B8]">
              {ethDominanceFormatted ? `ETH dominance ${ethDominanceFormatted}` : 'Market share'}
            </div>
          </div>
        </SpotlightCard>

        {/* Metric 4: Fear & Greed Index */}
        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Fear &amp; Greed Index</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#F0F4F8] font-mono tabular-nums">
                {fearGreedData?.value != null ? fearGreedData.value : '—'}
              </span>
              {fearGreedData?.value_classification && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getSentimentBadgeColor(
                    fearGreedData.value
                  )}`}
                >
                  {fearGreedData.value_classification}
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#1E232E] overflow-hidden">
              {fearGreedData?.value != null ? (
                <div
                  className="h-full bg-gradient-to-r from-[#FF5252] via-[#FFB300] to-[#00E676]"
                  style={{ width: `${Math.min(Math.max(fearGreedData.value, 0), 100)}%` }}
                />
              ) : null}
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* 3. Single coherent category toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 rounded-xl border border-[#262D38] bg-[#151921] p-2">
        <div
          role="tablist"
          aria-label="Cryptocurrency market categories"
          className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB300] ${
                  isActive
                    ? 'bg-[#FFB300]/15 text-[#FFB300] font-semibold border border-[#FFB300]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFB300] shrink-0" />
                )}
                <span>{cat}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 px-1 text-xs text-[#94A3B8] shrink-0">
          <span className="font-mono text-[11px]">
            Showing <span className="text-[#F0F4F8] font-semibold">{displayedCoins.length}</span> coins
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#00E676]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E676] animate-pulse" />
            Binance live stream active
          </span>
        </div>
      </div>

      {/* 4. Error State */}
      {marketsError && (
        <div className="rounded-xl border border-[#FF5252]/30 bg-[#FF5252]/10 p-4 text-xs text-[#FF5252] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#FF5252]" />
            <span className="text-[#F0F4F8]">
              Unable to refresh market data ({marketsErrorMessage instanceof Error ? marketsErrorMessage.message : 'CoinGecko rate-limited or offline'}). Cached data may be displayed.
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetchMarkets()}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#FF5252]/20 hover:bg-[#FF5252]/30 text-[#F0F4F8] font-medium transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* 5. Main Cryptocurrency Market Table */}
      <div className="rounded-xl border border-[#262D38] bg-[#151921] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-[#262D38] bg-[#0B0E14] text-[#94A3B8]">
                {renderSortHeader('rank', '#', 'center', 'w-12 pl-4 pr-2')}
                {renderSortHeader('name', 'Asset', 'left', 'min-w-[180px]')}
                {renderSortHeader('price', 'Price', 'right', 'w-32')}
                {renderSortHeader('change24h', '24h %', 'right', 'w-28')}
                {renderSortHeader('volume', '24h Volume', 'right', 'w-36')}
                {renderSortHeader('market_cap', 'Market Cap', 'right', 'w-36')}
                <th
                  scope="col"
                  className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-center text-[#94A3B8] w-28"
                >
                  7D Trend
                </th>
                <th
                  scope="col"
                  className="py-3 pr-4 pl-2 text-[11px] font-semibold uppercase tracking-wider text-right text-[#94A3B8] w-24"
                >
                  Trade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262D38]/50 text-xs">
              {marketsLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 pl-4 pr-2 text-center">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-center">
                      <Skeleton className="h-6 w-20 mx-auto" />
                    </td>
                    <td className="py-4 pr-4 pl-2 text-right">
                      <Skeleton className="h-6 w-14 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : displayedCoins.length > 0 ? (
                displayedCoins.map((coin, index) => {
                  const change24h = coin.price_change_percentage_24h
                  const isPositive = (change24h ?? 0) >= 0
                  const isStreamed = coin.isLiveStreamed
                  const rank = coin.market_cap_rank ?? index + 1
                  const sparklineData = coin.sparkline_in_7d?.price

                  return (
                    <tr
                      key={coin.id}
                      onClick={() => navigate(`/asset/${coin.id}`)}
                      className="border-b border-[#262D38]/40 hover:bg-[#1E232E] transition-colors cursor-pointer group"
                    >
                      {/* Rank */}
                      <td className="py-3.5 pl-4 pr-2 text-center text-xs font-mono text-[#94A3B8] tabular-nums">
                        {rank}
                      </td>

                      {/* Asset: icon + name + symbol + live badge */}
                      <td className="py-3.5 px-3 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="h-7 w-7 rounded-full object-cover shrink-0 bg-[#1E232E]"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.visibility = 'hidden'
                            }}
                          />
                          <div className="min-w-0 flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors truncate text-xs">
                                {coin.name}
                              </span>
                              <span className="text-[11px] font-mono uppercase text-[#94A3B8]">
                                {coin.symbol}
                              </span>
                              {isStreamed && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30"
                                  title="Instant WebSocket quotes from Binance stream"
                                >
                                  <span className="h-1 w-1 rounded-full bg-[#00E676] animate-pulse" />
                                  LIVE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price (right-aligned, tabular numerals) */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-[#F0F4F8]">
                        {formatCurrency(coin.current_price)}
                      </td>

                      {/* 24h Change (right-aligned, tabular numerals) */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs font-medium">
                        {change24h != null ? (
                          <span
                            className={`inline-flex items-center justify-end font-semibold ${
                              isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {change24h.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* 24h Trading Volume (right-aligned, tabular numerals) */}
                      <td
                        className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-[#94A3B8]"
                        title={
                          coin.total_volume != null && coin.total_volume > 0
                            ? `$${coin.total_volume.toLocaleString()}`
                            : undefined
                        }
                      >
                        {formatCompact(coin.total_volume)}
                      </td>

                      {/* Market Cap (right-aligned, tabular numerals) */}
                      <td
                        className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-[#94A3B8]"
                        title={
                          coin.market_cap != null && coin.market_cap > 0
                            ? `$${coin.market_cap.toLocaleString()}`
                            : undefined
                        }
                      >
                        {formatCompact(coin.market_cap)}
                      </td>

                      {/* 7D Trend: Sparkline if present, otherwise truthful dash */}
                      <td className="py-3.5 px-3 text-center">
                        {sparklineData && sparklineData.length >= 2 ? (
                          <SvgSparkline
                            data={sparklineData}
                            positive={isPositive}
                            width={90}
                            height={24}
                            className="mx-auto"
                          />
                        ) : (
                          <span className="text-[#94A3B8] text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Action: Trade */}
                      <td className="py-3.5 pr-4 pl-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenBuy(coin)
                          }}
                          className="rounded-md bg-[#1E232E] hover:bg-[#FFB300] text-[#F0F4F8] hover:text-[#0B0E14] text-xs font-medium px-2.5 py-1 transition-all cursor-pointer border border-[#262D38] hover:border-[#FFB300]"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6">
                    <EmptyState
                      icon={<AlertCircle className="h-8 w-8 text-[#94A3B8]" />}
                      title="No assets found"
                      description={
                        searchQuery
                          ? `No assets found matching "${searchQuery}" in category "${activeCategory}".`
                          : `No assets currently available in category "${activeCategory}".`
                      }
                      action={
                        (searchQuery || activeCategory !== 'All Coins') ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('')
                              setActiveCategory('All Coins')
                            }}
                            className="text-xs text-[#FFB300] hover:text-[#FFA000] font-medium underline cursor-pointer"
                          >
                            Reset search and filters
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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