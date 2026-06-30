import { useQuery } from '@tanstack/react-query'

export interface CryptoNews {
  id: string
  title: string
  url: string
  source: string
  published_at: string
}

export const useCryptoNews = (limit = 15) => {
  return useQuery<CryptoNews[]>({
    queryKey: ['crypto-news', limit],
    queryFn: async () => {
      // Using RSS2JSON free service to fetch real crypto news
      const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=cryptocurrency&hl=en-US&gl=US&ceid=US:en')
      
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`)
      const data = await res.json()
      
      return data.items.slice(0, limit).map((item: { title: string; link: string; author?: string; pubDate: string }, index: number) => ({
        id: String(index),
        title: item.title,
        url: item.link,
        source: item.author || 'News',
        published_at: item.pubDate,
      }))
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
  })
}