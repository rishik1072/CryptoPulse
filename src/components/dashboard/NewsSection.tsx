import { GlassCard } from '@/components/ui/GlassCard'

const mockNews = [
  { title: "Bitcoin ETF inflows reach new all-time high", source: "CoinDesk", time: "2h ago" },
  { title: "Ethereum L2 activity surges 42% this month", source: "The Block", time: "6h ago" },
  { title: "Solana Foundation announces new validator program", source: "CryptoSlate", time: "11h ago" },
]

export function NewsSection() {
  return (
    <GlassCard className="card-sheen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight">Latest Crypto News</div>
          <div className="text-sm text-slate-400">A quick pulse on the market</div>
        </div>
        <div className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Browse all →</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mockNews.map((news, idx) => (
          <div key={idx} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10">
            <div className="pr-2 text-sm font-medium leading-6 tracking-tight text-white transition-colors group-hover:text-primary">
              {news.title}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <div>{news.source}</div>
              <div>{news.time}</div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}