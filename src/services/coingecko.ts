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
    return failureCount < 1
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
}

export async function fetchJsonSafely<T>(url: string, context: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url)
  } catch (err) {
    throw new ApiError(`Network failure while fetching ${context}: ${(err as Error).message}`)
  }

  if (res.status === 429) {
    throw new ApiError(`CoinGecko rate limit exceeded (HTTP 429) for ${context}. Please wait a moment.`, 429, true)
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