import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useGlobalData, useTrendingCoins } from '@/services/coingecko'
import { Search, Bookmark, Share2, Clock } from 'lucide-react'

interface NewsItem {
  id: number
  title: string
  source: string
  time: string
  category: string
  readTime: number
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: 1,
    title: 'Bitcoin holds above key support as ETF inflows continue',
    source: 'CoinDesk',
    time: '12m ago',
    category: 'Bitcoin',
    readTime: 4,
  },
  {
    id: 2,
    title: 'Ethereum developers push forward with staking and L2 upgrades',
    source: 'The Block',
    time: '32m ago',
    category: 'Ethereum',
    readTime: 5,
  },
  {
    id: 3,
    title: 'AI tokens rally as infrastructure demand continues to expand',
    source: 'Decrypt',
    time: '1h ago',
    category: 'AI',
    readTime: 3,
  },
]

const CATEGORIES = ['All', 'Bitcoin', 'Ethereum', 'AI']

export default function News() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [bookmarked, setBookmarked] = useState<number[]>([])

  const { data: globalData } = useGlobalData()
  const { data: trending } = useTrendingCoins()

  const global = globalData?.data

  const filteredNews = MOCK_NEWS.filter(news => {
    const matchesSearch = news.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || news.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const toggleBookmark = (id: number) => {
    setBookmarked(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-[-2px]">News Center</h1>
          <p className="text-muted mt-1">Real-time crypto intelligence</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 py-3 text-sm"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-1.5 rounded-2xl text-sm transition-all ${activeCategory === cat ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* News Feed */}
        <div className="xl:col-span-8 space-y-4">
          {filteredNews.length === 0 ? (
            <GlassCard>
              <div className="py-12 text-center text-muted">No news found matching your filters.</div>
            </GlassCard>
          ) : (
            filteredNews.map((news) => (
              <GlassCard key={news.id} className="group">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted mb-2">
                      <span>{news.source}</span>
                      <span>•</span>
                      <span>{news.time}</span>
                      <span className="px-2 py-px rounded bg-white/10 text-[10px]">{news.category}</span>
                    </div>
                    
                    <h3 className="font-semibold text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">
                      {news.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {news.readTime} min read
                      </div>
                      <button 
                        onClick={() => toggleBookmark(news.id)}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${bookmarked.includes(news.id) ? 'fill-warning text-warning' : ''}`} /> 
                        {bookmarked.includes(news.id) ? 'Saved' : 'Save'}
                      </button>
                      <button className="flex items-center gap-1 hover:text-white">
                        <Share2 className="h-3.5 w-3.5" /> Share
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
          {/* Fear & Greed */}
          <GlassCard>
            <div className="text-xs text-muted mb-3">FEAR &amp; GREED INDEX</div>
            <div className="text-6xl font-semibold tracking-[-2px]">
              {global ? Math.round(68) : '—'}
            </div>
            <div className="text-success text-sm mt-1">Greed • Neutral territory</div>
          </GlassCard>

          {/* Market Snapshot */}
          <GlassCard>
            <div className="text-xs text-muted mb-4">MARKET SNAPSHOT</div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span>BTC Dominance</span>
                <span className="font-mono">{global?.market_cap_percentage.btc.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>ETH Dominance</span>
                <span className="font-mono">{global?.market_cap_percentage.eth.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Global Volume</span>
                <span className="font-mono">${((global?.total_volume.usd || 0) / 1e9).toFixed(1)}B</span>
              </div>
            </div>
          </GlassCard>

          {/* Trending Coins */}
          <GlassCard>
            <div className="text-xs text-muted mb-4">TRENDING</div>
            <div className="space-y-3 text-sm">
              {trending?.coins?.slice(0, 5).map((coin: { item: { small: string; name: string; data: { price_change_percentage_24h: { usd: number } } } }, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={coin.item.small} className="h-5 w-5 rounded-full" alt="" />
                    <span>{coin.item.name}</span>
                  </div>
                  <span className="text-xs text-success">+{coin.item.data.price_change_percentage_24h.usd.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}