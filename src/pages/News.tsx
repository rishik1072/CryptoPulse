import { useState, useMemo, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useGlobalData, useTrendingCoins } from '@/services/coingecko'
import { useCryptoNewsFeed, type CryptoNews } from '@/services/news'
import { FearGreedWidget } from '@/components/dashboard/FearGreedWidget'
import { Search, Bookmark, Share2, ExternalLink, KeyRound, RefreshCw, AlertCircle } from 'lucide-react'
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">News Center</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Verified, real-time cryptocurrency news and publisher intelligence</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search verified stories..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Category Filters */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main News Feed */}
        <div className="xl:col-span-8 space-y-4">
          {/* Configuration Required Banner if no key and feed unreachable */}
          {newsFeed?.requiresApiKey && (
            <GlassCard className="border-amber-500/20 bg-amber-500/5 p-6 text-slate-800 dark:text-slate-200">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">API Configuration Notice</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Live crypto news integration requires an authentic provider key. CryptoPulse never fabricates headlines or simulates articles when external endpoints are unconfigured or rate-limited.
                  </p>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-mono text-amber-800 dark:text-amber-300">
                    Set VITE_CRYPTOCOMPARE_API_KEY=your_key in .env.local
                  </div>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="https://min-api.cryptocompare.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    >
                      <span>Get Free CryptoCompare Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Check Connection</span>
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Rate limited notice */}
          {newsFeed?.isRateLimited && (
            <GlassCard className="border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>News service rate limit reached. Cached articles remain visible. Please retry shortly.</div>
            </GlassCard>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <GlassCard key={index} className="p-5">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-6 w-4/5 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : isError && articles.length === 0 ? (
            <GlassCard>
              <div className="py-12 text-center space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                <div className="text-base font-semibold text-slate-900 dark:text-white">Unable to Load News Feed</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {error instanceof Error ? error.message : 'An error occurred while contacting the news service.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </GlassCard>
          ) : filteredNews.length === 0 ? (
            <GlassCard>
              <div className="py-12 text-center text-slate-500 text-sm">
                {search ? 'No verified stories found matching your search.' : 'No stories available in this category.'}
              </div>
            </GlassCard>
          ) : (
            filteredNews.map((news) => (
              <GlassCard key={news.id} className="group transition-all hover:border-slate-300 dark:hover:border-slate-700 p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500">
                    <span className="font-semibold text-violet-600 dark:text-violet-400">{news.source}</span>
                    <span>&bull;</span>
                    <span>{formatTimeAgo(news.published_at)}</span>
                    {news.category && (
                      <>
                        <span>&bull;</span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          {news.category}
                        </span>
                      </>
                    )}
                  </div>

                  <a
                    href={news.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors"
                  >
                    <h3 className="font-semibold text-lg sm:text-xl tracking-tight leading-snug text-slate-900 dark:text-white">
                      {news.title}
                    </h3>
                  </a>

                  {news.body && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {news.body}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-500 dark:text-violet-400 font-medium"
                    >
                      <span>Read original article</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleBookmark(news.id)}
                        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                        aria-label={bookmarked.includes(news.id) ? 'Remove bookmark' : 'Bookmark article'}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${bookmarked.includes(news.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                        <span>{bookmarked.includes(news.id) ? 'Saved' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => handleShare(news)}
                        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                        aria-label="Share article"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="xl:col-span-4 space-y-6">
          {/* Authentic Fear & Greed widget */}
          <FearGreedWidget />

          {/* Market Snapshot */}
          <GlassCard>
            <div className="text-xs text-muted mb-4 tracking-[1.5px] font-semibold">MARKET SNAPSHOT</div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">BTC Dominance</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {global?.market_cap_percentage?.btc != null ? `${global.market_cap_percentage.btc.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">ETH Dominance</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {global?.market_cap_percentage?.eth != null ? `${global.market_cap_percentage.eth.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Global 24h Volume</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {global?.total_volume?.usd != null ? `$${(global.total_volume.usd / 1e9).toFixed(1)}B` : '—'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Trending Coins */}
          <GlassCard>
            <div className="text-xs text-muted mb-4 tracking-[1.5px] font-semibold">TRENDING COINS</div>
            <div className="space-y-3 text-sm">
              {trending?.coins && trending.coins.length > 0 ? (
                trending.coins.slice(0, 5).map((coin, i: number) => {
                  const change = coin.item.data?.price_change_percentage_24h?.usd
                  const isPositive = (change ?? 0) >= 0
                  return (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <img src={coin.item.small} className="h-5 w-5 rounded-full" alt={coin.item.name} />
                        <span className="font-medium text-slate-900 dark:text-white">{coin.item.name}</span>
                      </div>
                      {change != null ? (
                        <span className={`text-xs font-mono font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted font-mono">—</span>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-xs text-slate-400 py-2">No trending coins available</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}