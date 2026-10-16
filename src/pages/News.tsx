import { useState, useMemo, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useGlobalData, useTrendingCoins } from '@/services/coingecko'
import { useCryptoNewsFeed, type CryptoNews } from '@/services/news'
import { FearGreedWidget } from '@/components/dashboard/FearGreedWidget'
import { Search, Bookmark, Share2, ExternalLink, KeyRound, RefreshCw, AlertCircle, X, Newspaper } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'

function formatTimeAgo(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime()
    if (Number.isNaN(timestamp)) return 'Recently'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return 'Recently'
  }
}

export default function News() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('cryptopulse-bookmarked-news')
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('cryptopulse-bookmarked-news', JSON.stringify(bookmarked))
    } catch {
      // Ignore storage errors
    }
  }, [bookmarked])

  const { data: newsFeed, isLoading, isError, error, refetch } = useCryptoNewsFeed(30)
  const { data: globalData } = useGlobalData()
  const { data: trending } = useTrendingCoins()

  const global = globalData?.data
  const articles = useMemo(() => newsFeed?.articles ?? [], [newsFeed?.articles])

  // Derive available categories dynamically from real articles
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>(['All'])
    for (const a of articles) {
      if (a.category && a.category !== 'Market') {
        catSet.add(a.category)
      }
    }
    return Array.from(catSet).slice(0, 8)
  }, [articles])

  const filteredNews = useMemo(() => {
    return articles.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase()) ||
        (item.body ? item.body.toLowerCase().includes(search.toLowerCase()) : false)

      const matchesCategory =
        activeCategory === 'All' ||
        (item.category && item.category.toLowerCase() === activeCategory.toLowerCase())

      return matchesSearch && matchesCategory
    })
  }, [articles, search, activeCategory])

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((i) => i !== id) : [...prev, id]
      toast.success(exists ? 'Article removed from saved' : 'Article saved')
      return next
    })
  }

  const handleShare = async (article: CryptoNews) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: article.url,
        })
        return
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(article.url)
      toast.success('Article link copied to clipboard')
    }
  }

  return (
    <div className="mx-auto max-w-[1720px] space-y-4">
      {/* 1. Page Header with aligned search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              News Center
            </h1>
            <span className="text-[11px] font-medium font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
              {articles.length} Stories
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Verified cryptocurrency headlines, macro policy updates, and publisher intelligence.
          </p>
        </div>

        {/* Search input aligned with header */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search verified stories..."
            aria-label="Search stories"
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-elevated border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Toolbar */}
      {availableCategories.length > 1 && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-surface p-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {availableCategories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E232E] text-[#FFB300] font-semibold border border-[#FFB300]/40 shadow-sm'
                      : 'text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] border border-transparent'
                  }`}
                >
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#FFB300] shrink-0" />}
                  <span>{cat}</span>
                </button>
              )
            })}
          </div>

          <div className="text-[11px] font-mono text-[#94A3B8] px-1 hidden sm:block">
            Showing <span className="text-[#F0F4F8] font-semibold">{filteredNews.length}</span> articles
          </div>
        </div>
      )}

      {/* 3. Main Grid: Feed + Market Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Main News Feed */}
        <div className="xl:col-span-8 space-y-3">
          {/* Configuration Required Banner if no key and feed unreachable */}
          {newsFeed?.requiresApiKey && (
            <div className="rounded-xl border border-[#FFB300]/30 bg-[#FFB300]/10 p-4 text-xs text-[#FFB300]">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#FFB300]/15 p-2 text-[#FFB300] shrink-0">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-semibold text-[#FFB300]">API Configuration Notice</h3>
                  <p className="text-xs text-[#F0F4F8] leading-relaxed">
                    Live crypto news integration requires an authentic provider key. CryptoPulse never fabricates headlines or simulates articles when external endpoints are unconfigured or rate-limited.
                  </p>
                  <div className="rounded-md border border-[#FFB300]/30 bg-[#FFB300]/10 p-2 text-[11px] font-mono text-[#FFB300]">
                    Set VITE_CRYPTOCOMPARE_API_KEY=your_key in .env.local
                  </div>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <a
                      href="https://min-api.cryptocompare.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
                    >
                      <span>Get Free API Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#262D38] bg-[#151921] hover:bg-[#1E232E] px-3 py-1.5 text-xs font-medium text-[#F0F4F8] transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Check Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate limited notice */}
          {newsFeed?.isRateLimited && (
            <div className="rounded-xl border border-[#FFB300]/30 bg-[#FFB300]/10 p-3.5 text-xs text-[#FFB300] flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#FFB300]" />
              <div className="text-[#F0F4F8]">News service rate limit reached. Cached articles remain visible. Please retry shortly.</div>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 space-y-2.5">
                  <div className="flex gap-2">
                    <Skeleton className="h-3.5 w-20 rounded" />
                    <Skeleton className="h-3.5 w-14 rounded" />
                  </div>
                  <Skeleton className="h-5 w-4/5 rounded" />
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : isError && articles.length === 0 ? (
            <EmptyState
              boxed
              icon={<AlertCircle className="h-8 w-8 text-[#FF5252]" />}
              title="Unable to Load News Feed"
              description={error instanceof Error ? error.message : 'An error occurred while contacting the news service.'}
              action={
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              }
            />
          ) : filteredNews.length === 0 ? (
            <EmptyState
              boxed
              icon={<Newspaper className="h-8 w-8 text-[#94A3B8]" />}
              title="No stories found"
              description={search ? `No stories matching "${search}".` : 'No stories currently available in this category.'}
              action={
                search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="text-xs text-[#FFB300] hover:text-[#FFA000] font-medium underline cursor-pointer"
                  >
                    Clear search
                  </button>
                ) : undefined
              }
            />
          ) : (
            filteredNews.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#262D38] bg-[#151921] p-4.5 hover:border-[#FFB300]/40 transition-all shadow-sm group"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                    <span className="font-semibold text-[#FFB300]">{item.source}</span>
                    <span>&bull;</span>
                    <span className="text-[#94A3B8]">{formatTimeAgo(item.published_at)}</span>
                    {item.category && (
                      <>
                        <span>&bull;</span>
                        <span className="rounded bg-[#1E232E] border border-[#262D38] px-2 py-0.2 text-[10px] font-medium text-[#F0F4F8]">
                          {item.category}
                        </span>
                      </>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block group-hover:text-[#FFB300] transition-colors"
                  >
                    <h3 className="font-semibold text-base sm:text-lg tracking-tight leading-snug text-[#F0F4F8] group-hover:text-[#FFB300] transition-colors">
                      {item.title}
                    </h3>
                  </a>

                  {item.body && (
                    <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#262D38]/50 text-xs text-[#94A3B8]">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-[#FFB300] hover:text-[#FFA000] font-medium"
                    >
                      <span>Read original story</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleBookmark(item.id)}
                        className="flex items-center gap-1 hover:text-[#F0F4F8] transition-colors cursor-pointer"
                        aria-label={bookmarked.includes(item.id) ? 'Remove bookmark' : 'Bookmark article'}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            bookmarked.includes(item.id) ? 'fill-[#FFB300] text-[#FFB300]' : 'text-[#94A3B8]'
                          }`}
                        />
                        <span className="text-xs">{bookmarked.includes(item.id) ? 'Saved' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => handleShare(item)}
                        className="flex items-center gap-1 hover:text-[#F0F4F8] transition-colors cursor-pointer"
                        aria-label="Share article"
                      >
                        <Share2 className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span className="text-xs">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Market Widgets */}
        <div className="xl:col-span-4 space-y-4">
          {/* Authentic Fear & Greed widget */}
          <FearGreedWidget />

          {/* Market Snapshot */}
          <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8] mb-3">
              Market Snapshot
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#262D38]/50">
                <span className="text-[#94A3B8]">BTC Dominance</span>
                <span className="font-mono font-semibold text-[#F0F4F8] tabular-nums">
                  {global?.market_cap_percentage?.btc != null
                    ? `${global.market_cap_percentage.btc.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#262D38]/50">
                <span className="text-[#94A3B8]">ETH Dominance</span>
                <span className="font-mono font-semibold text-[#F0F4F8] tabular-nums">
                  {global?.market_cap_percentage?.eth != null
                    ? `${global.market_cap_percentage.eth.toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#94A3B8]">Global 24h Volume</span>
                <span className="font-mono font-semibold text-[#F0F4F8] tabular-nums">
                  {global?.total_volume?.usd != null
                    ? `$${(global.total_volume.usd / 1e9).toFixed(1)}B`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Trending Coins */}
          <div className="rounded-xl border border-[#262D38] bg-[#151921] p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#94A3B8] mb-3">
              Trending Coins
            </div>
            <div className="space-y-2 text-xs">
              {trending?.coins && trending.coins.length > 0 ? (
                trending.coins.slice(0, 5).map((coin, i: number) => {
                  const change = coin.item.data?.price_change_percentage_24h?.usd
                  const isPositive = (change ?? 0) >= 0
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center py-1 hover:bg-[#1E232E] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={coin.item.small}
                          className="h-4.5 w-4.5 rounded-full object-cover shrink-0"
                          alt={coin.item.name}
                        />
                        <span className="font-medium text-[#F0F4F8]">{coin.item.name}</span>
                        <span className="text-[10px] font-mono uppercase text-[#94A3B8]">
                          {coin.item.symbol}
                        </span>
                      </div>
                      {change != null ? (
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'
                          }`}
                        >
                          {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono">—</span>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-[#94A3B8] py-1">No trending coins available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}