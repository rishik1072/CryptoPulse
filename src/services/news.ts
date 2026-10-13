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
      const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=cryptocurrency&hl=en-US&gl=US&ceid=US:en')
      
      let res: Response
      try {
        res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`)
      } catch (err) {
        throw new Error(`Failed to fetch crypto news: ${(err as Error).message}`)
      }

      if (!res.ok) {
        throw new Error(`Crypto news feed unavailable (HTTP ${res.status})`)
      }

      const data = await res.json()
      if (!data || !Array.isArray(data.items)) {
        return []
      }
      
      return data.items.slice(0, limit).map((item: { title: string; link: string; author?: string; pubDate: string }, index: number) => ({
        id: String(index),
        title: item.title || 'Untitled',
        url: item.link || '#',
        source: item.author || 'News',
        published_at: item.pubDate || new Date().toISOString(),
      }))
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })
}