import { GlassCard } from '@/components/ui/GlassCard'
import { Link } from 'react-router-dom'
import { useCryptoNews } from '@/services/news'
import { Skeleton } from '@/components/ui/Skeleton'

export function NewsSection() {
  const { data: news = [], isLoading } = useCryptoNews(3)

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-100 font-heading">Latest Crypto News</div>
          <div className="text-xs text-slate-400">Verified market updates and announcements</div>
        </div>
        <Link to="/news" className="text-xs font-medium text-[#FFB300] hover:text-[#FFA000] transition-colors">
          Browse all →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-[#262D38] bg-[#1E232E] p-4">
              <Skeleton className="h-4 w-full mb-2 bg-[#262D38]" />
              <Skeleton className="h-4 w-3/4 mb-4 bg-[#262D38]" />
              <Skeleton className="h-3 w-1/2 bg-[#262D38]" />
            </div>
          ))
        ) : news.length === 0 ? (
          <div className="col-span-3 py-6 text-center text-xs text-[#94A3B8]">
            No recent news stories currently available.
          </div>
        ) : (
          news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group rounded-xl border border-[#262D38] bg-[#1E232E] p-4 transition-colors hover:border-[#FFB300]/40 hover:bg-[#1E232E]/80"
            >
              <div className="pr-2 text-xs font-medium leading-5 text-[#F0F4F8] transition-colors group-hover:text-[#FFB300] line-clamp-2">
                {item.title}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold text-[#FFB300]">{item.source}</span>
                <span>{item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Recent'}</span>
              </div>
            </a>
          ))
        )}
      </div>
    </GlassCard>
  )
}