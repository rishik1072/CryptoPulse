import { useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export class ApiError extends Error {
  status?: number
  isRateLimited: boolean

  constructor(message: string, status?: number, isRateLimited: boolean = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isRateLimited = isRateLimited
  }
}

export const apiRetryConfig = {
  retry: (failureCount: number, error: unknown) => {
    // Never retry on HTTP 429 to avoid aggravating rate limits
    if (error instanceof ApiError && error.isRateLimited) {
      return false
    }
    if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 429) {
      return false
    }
    // Never retry on HTTP 404 (non-recoverable resource not found)
    if (error instanceof ApiError && error.status === 404) {
      return false
    }
    if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
      return false
    }
    return failureCount < 1
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
}

export interface FetchOptions {
  signal?: AbortSignal
  timeoutMs?: number
  headers?: HeadersInit
}

export async function fetchJsonSafely<T>(
  url: string,
  context: string,
  options?: FetchOptions
): Promise<T> {
  let res: Response
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const fetchInit: RequestInit = {}

    // Support AbortSignal & timeout
    if (options?.signal || options?.timeoutMs) {
      if (options?.timeoutMs && !options?.signal) {
        const controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)
        fetchInit.signal = controller.signal
      } else if (options?.signal) {
        fetchInit.signal = options.signal
      }
    }

    if (options?.headers) {
      fetchInit.headers = options.headers
    }

    res = await fetch(url, fetchInit)
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    // If request was actively cancelled by an external abort signal, rethrow
    if (options?.signal?.aborted) {
      throw err
    }
    throw new ApiError(`Network failure while fetching ${context}: ${(err as Error).message}`)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  if (res.status === 429) {
    throw new ApiError(`CoinGecko rate limit exceeded (HTTP 429) for ${context}. Please wait a moment.`, 429, true)
  }

  if (res.status === 404) {
    throw new ApiError(`Asset or endpoint not found for ${context} (HTTP 404)`, 404, false)
  }

  if (!res.ok) {
    let errorDetail = ''
    try {
      const body = await res.json()
      errorDetail = body?.error || body?.status?.error_message || ''
    } catch {
      // Ignore JSON parse failure on HTTP error responses
    }
    throw new ApiError(
      `Failed to fetch ${context} (HTTP ${res.status}${errorDetail ? `: ${errorDetail}` : ''})`,
      res.status
    )
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError(`Malformed JSON response received from ${context}`)
  }
}

export interface CoinMarketData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
  image: string
  categories?: string[]
}

export interface GlobalData {
  data: {
    total_market_cap: { usd: number }
    total_volume: { usd: number }
    market_cap_percentage: { btc: number; eth: number }
    market_cap_change_percentage_24h_usd: number
    active_cryptocurrencies: number
  }
}

export interface TrendingCoin {
  item: {
    id: string
    name: string
    symbol: string
    small: string
    data: {
      price: number
      price_change_percentage_24h: { usd: number }
    }
  }
}

export interface CoinSearchResult {
  id: string
  name: string
  symbol: string
  market_cap_rank?: number | null
  thumb?: string
  large?: string
}

const BASE_URL = 'https://api.coingecko.com/api/v3'

export const useGlobalData = () => {
  return useQuery<GlobalData>({
    queryKey: ['global'],
    queryFn: async () => {
      const data = await fetchJsonSafely<GlobalData>(`${BASE_URL}/global`, 'global market overview')
      if (!data || typeof data !== 'object' || !data.data) {
        throw new ApiError('Invalid response shape for global market data')
      }
      return data
    },
    staleTime: 1000 * 60 * 5,
    ...apiRetryConfig,
  })
}

export const useMarketData = (limit = 50) => {
  return useQuery<CoinMarketData[]>({
    queryKey: ['markets', limit],
    queryFn: async () => {
      const data = await fetchJsonSafely<unknown>(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`,
        'market data'
      )
      if (!Array.isArray(data)) {
        throw new ApiError('Expected array for market data, received invalid format')
      }
      return data as CoinMarketData[]
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    ...apiRetryConfig,
  })
}

export const useCoinsMarketData = (coinIds: string[], cachedCoins?: CoinMarketData[]) => {
  const cachedIds = useMemo(() => {
    if (!cachedCoins || cachedCoins.length === 0) return new Set<string>()
    return new Set(cachedCoins.map((c) => c.id.toLowerCase()))
  }, [cachedCoins])

  const normalizedIds = useMemo(() => {
    return Array.from(
      new Set(
        coinIds
          .map((id) => id?.trim().toLowerCase())
          .filter((id): id is string => Boolean(id) && !cachedIds.has(id))
      )
    ).sort()
  }, [coinIds, cachedIds])

  return useQuery<CoinMarketData[]>({
    queryKey: ['coins-markets', normalizedIds.join(',')],
    queryFn: async () => {
      if (normalizedIds.length === 0) return []
      const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        normalizedIds.join(',')
      )}&order=market_cap_desc&sparkline=false`
      const data = await fetchJsonSafely<unknown>(url, `market data for ${normalizedIds.join(', ')}`)
      if (!Array.isArray(data)) {
        throw new ApiError('Expected array for specific coins market data')
      }
      return data as CoinMarketData[]
    },
    enabled: normalizedIds.length > 0,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    ...apiRetryConfig,
  })
}

export const useInfiniteMarketData = (perPage = 50) => {
  return useInfiniteQuery<CoinMarketData[]>({
    queryKey: ['markets-infinite', perPage],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const data = await fetchJsonSafely<unknown>(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${pageParam}&sparkline=false`,
        `infinite markets (page ${pageParam})`
      )
      if (!Array.isArray(data)) {
        throw new ApiError('Failed to fetch markets page: invalid array format')
      }
      return data as CoinMarketData[]
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length === perPage ? allPages.length + 1 : undefined),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    ...apiRetryConfig,
  })
}

export const useTrendingCoins = () => {
  return useQuery<{ coins: TrendingCoin[] }>({
    queryKey: ['trending'],
    queryFn: async () => {
      const data = await fetchJsonSafely<{ coins?: TrendingCoin[] }>(
        `${BASE_URL}/search/trending`,
        'trending coins'
      )
      if (!data || !Array.isArray(data.coins)) {
        throw new ApiError('Invalid response shape for trending coins')
      }
      return { coins: data.coins }
    },
    staleTime: 1000 * 60 * 10,
    ...apiRetryConfig,
  })
}

export async function searchCoinGecko(query: string): Promise<CoinSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const data = await fetchJsonSafely<{ coins?: CoinSearchResult[] }>(
    `${BASE_URL}/search?query=${encodeURIComponent(trimmed)}`,
    `coin search for "${trimmed}"`
  )

  if (!data || !Array.isArray(data.coins)) {
    return []
  }

  return data.coins
}

export const useFearGreed = () => {
  return useQuery({
    queryKey: ['fear-greed'],
    queryFn: () =>
      Promise.resolve({
        value: 68,
        classification: 'Greed',
        timestamp: Date.now(),
      }),
    staleTime: Infinity,
  })
}

export interface CoinDetail {
  id: string
  name: string
  symbol: string
  image: { large: string; thumb?: string; small?: string }
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    total_volume: { usd: number }
    circulating_supply: number
    max_supply: number | null
    ath: { usd: number }
    atl: { usd: number }
    price_change_percentage_24h: number
    market_cap_rank?: number | null
  }
  description: { en: string }
  links: {
    homepage: string[]
    blockchain_site: string[]
    repos_url: { github: string[] }
    twitter_screen_name: string
    subreddit_url: string
  }
  categories: string[]
}

/**
 * Fetches coin details with safe fallback to market endpoint on transient errors
 */
export async function getCoinDetail(coinId: string, signal?: AbortSignal): Promise<CoinDetail> {
  const trimmed = coinId?.trim().toLowerCase()
  if (!trimmed) {
    throw new ApiError('Coin identifier cannot be empty', 400)
  }

  const encodedId = encodeURIComponent(trimmed)

  // 1. Primary attempt: CoinGecko detailed coins endpoint
  try {
    const data = await fetchJsonSafely<CoinDetail>(
      `${BASE_URL}/coins/${encodedId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      `coin details for ${trimmed}`,
      { signal, timeoutMs: 10000 }
    )
    if (data && data.id && data.symbol && data.market_data) {
      return data
    }
  } catch (err) {
    // If the coin returned 404, it genuinely does not exist on provider
    if (err instanceof ApiError && err.status === 404) {
      throw err
    }

    // 2. Fallback attempt: Lightweight /coins/markets endpoint (higher CDN cache rate)
    try {
      const fallbackUrl = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${encodedId}&sparkline=false`
      const markets = await fetchJsonSafely<CoinMarketData[]>(
        fallbackUrl,
        `fallback market data for ${trimmed}`,
        { signal, timeoutMs: 8000 }
      )
      if (Array.isArray(markets) && markets.length > 0) {
        const m = markets[0]
        return {
          id: m.id,
          name: m.name,
          symbol: m.symbol,
          image: { large: m.image, small: m.image, thumb: m.image },
          market_data: {
            current_price: { usd: m.current_price },
            market_cap: { usd: m.market_cap },
            total_volume: { usd: m.total_volume },
            circulating_supply: 0,
            max_supply: null,
            ath: { usd: 0 },
            atl: { usd: 0 },
            price_change_percentage_24h: m.price_change_percentage_24h ?? 0,
            market_cap_rank: null,
          },
          description: { en: '' },
          links: {
            homepage: [],
            blockchain_site: [],
            repos_url: { github: [] },
            twitter_screen_name: '',
            subreddit_url: '',
          },
          categories: m.categories ?? [],
        }
      }
    } catch {
      // Fallback failed, rethrow original primary error
    }

    throw err
  }

  throw new ApiError(`Invalid coin detail response format for ${trimmed}`)
}

export const useCoinDetail = (coinId?: string, initialData?: CoinDetail) => {
  const normalizedId = coinId?.trim().toLowerCase()

  return useQuery<CoinDetail>({
    queryKey: ['coin-detail', normalizedId],
    queryFn: ({ signal }) => getCoinDetail(normalizedId!, signal),
    enabled: Boolean(normalizedId),
    initialData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...apiRetryConfig,
  })
}