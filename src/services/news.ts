import { useQuery } from '@tanstack/react-query'

export interface CryptoNews {
  id: string
  title: string
  url: string
  source: string
  published_at: string
  category?: string
  imageUrl?: string
  body?: string
}

export interface NewsFeedResponse {
  articles: CryptoNews[]
  requiresApiKey: boolean
  isRateLimited: boolean
  provider: 'cryptocompare' | 'cryptopanic' | 'coindesk-rss' | 'none'
  error: string | null
}

export async function fetchCryptoNewsData(limit = 15): Promise<NewsFeedResponse> {
  const cryptoCompareKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_CRYPTOCOMPARE_API_KEY
    ? String(import.meta.env.VITE_CRYPTOCOMPARE_API_KEY).trim()
    : ''

  const cryptoPanicKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_CRYPTOPANIC_API_KEY
    ? String(import.meta.env.VITE_CRYPTOPANIC_API_KEY).trim()
    : ''

  // 1. If CryptoCompare API key is configured, use it
  if (cryptoCompareKey) {
    try {
      const res = await fetch(`https://min-api.cryptocompare.com/data/v2/news/?lang=EN&api_key=${encodeURIComponent(cryptoCompareKey)}`)
      if (res.status === 401 || res.status === 403) {
        return {
          articles: [],
          requiresApiKey: true,
          isRateLimited: false,
          provider: 'cryptocompare',
          error: 'CryptoCompare API key is invalid or unauthorized.',
        }
      }
      if (res.status === 429) {
        return {
          articles: [],
          requiresApiKey: false,
          isRateLimited: true,
          provider: 'cryptocompare',
          error: 'CryptoCompare API rate limit reached (HTTP 429).',
        }
      }
      if (res.ok) {
        const json = await res.json()
        const rawData = Array.isArray(json?.Data) ? json.Data : []
        const articles: CryptoNews[] = rawData.slice(0, limit).map((item: {
          id: string | number
          title: string
          url: string
          source_info?: { name: string }
          source?: string
          published_on?: number
          categories?: string
          imageurl?: string
          body?: string
        }) => ({
          id: String(item.id),
          title: item.title || 'Untitled',
          url: item.url || '#',
          source: item.source_info?.name || item.source || 'CryptoCompare',
          published_at: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
          category: item.categories?.split('|')[0] || 'Market',
          imageUrl: item.imageurl,
          body: item.body,
        }))

        return {
          articles,
          requiresApiKey: false,
          isRateLimited: false,
          provider: 'cryptocompare',
          error: null,
        }
      }
    } catch {
      // Fall through to other sources on network failure
    }
  }

  // 2. If CryptoPanic key is configured, query CryptoPanic
  if (cryptoPanicKey) {
    try {
      const res = await fetch(`https://cryptopanic.com/api/free/v1/posts/?auth_token=${encodeURIComponent(cryptoPanicKey)}&public=true`)
      if (res.status === 401 || res.status === 403) {
        return {
          articles: [],
          requiresApiKey: true,
          isRateLimited: false,
          provider: 'cryptopanic',
          error: 'CryptoPanic auth token is invalid or expired.',
        }
      }
      if (res.status === 429) {
        return {
          articles: [],
          requiresApiKey: false,
          isRateLimited: true,
          provider: 'cryptopanic',
          error: 'CryptoPanic rate limit reached (HTTP 429).',
        }
      }
      if (res.ok) {
        const json = await res.json()
        const results = Array.isArray(json?.results) ? json.results : []
        const articles: CryptoNews[] = results.slice(0, limit).map((item: {
          id: number | string
          title: string
          url: string
          source?: { title: string }
          published_at?: string
        }) => ({
          id: String(item.id),
          title: item.title || 'Untitled',
          url: item.url || '#',
          source: item.source?.title || 'CryptoPanic',
          published_at: item.published_at || new Date().toISOString(),
          category: 'Market',
        }))

        return {
          articles,
          requiresApiKey: false,
          isRateLimited: false,
          provider: 'cryptopanic',
          error: null,
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. Public RSS feed fallback via rss2json (CoinDesk verified RSS feed)
  try {
    const rssTarget = encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssTarget}`)

    if (res.status === 429) {
      return {
        articles: [],
        requiresApiKey: false,
        isRateLimited: true,
        provider: 'coindesk-rss',
        error: 'News feed rate limit reached. Please wait a moment or configure a personal API key.',
      }
    }

    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const articles: CryptoNews[] = data.items.slice(0, limit).map((item: {
          title: string
          link: string
          author?: string
          pubDate: string
          categories?: string[]
          description?: string
        }, index: number) => ({
          id: String(index),
          title: item.title || 'Untitled',
          url: item.link || '#',
          source: item.author || 'CoinDesk',
          published_at: item.pubDate || new Date().toISOString(),
          category: (item.categories && item.categories[0]) || 'Market',
          body: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 160),
        }))

        return {
          articles,
          requiresApiKey: false,
          isRateLimited: false,
          provider: 'coindesk-rss',
          error: null,
        }
      }
    }
  } catch {
    // Handled below
  }

  // 4. Honest configuration requirement state if no key is supplied and public proxy is unavailable
  return {
    articles: [],
    requiresApiKey: true,
    isRateLimited: false,
    provider: 'none',
    error: 'Live crypto news requires an API key (CryptoCompare or CryptoPanic), or the public news feed is currently unreachable.',
  }
}

export const useCryptoNewsFeed = (limit = 15) => {
  return useQuery<NewsFeedResponse>({
    queryKey: ['crypto-news-feed', limit],
    queryFn: () => fetchCryptoNewsData(limit),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  })
}

// Backwards-compatible hook returning array of articles
export const useCryptoNews = (limit = 15) => {
  const query = useCryptoNewsFeed(limit)
  return {
    ...query,
    data: query.data?.articles ?? [],
  }
}