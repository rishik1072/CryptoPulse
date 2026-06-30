import { useQuery } from '@tanstack/react-query'

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

const BASE_URL = 'https://api.coingecko.com/api/v3'

export const useGlobalData = () => {
  return useQuery<GlobalData>({
    queryKey: ['global'],
    queryFn: () => fetch(`${BASE_URL}/global`).then(res => res.json()),
    staleTime: 1000 * 60 * 5,
  })
}

export const useMarketData = (limit = 10) => {
  return useQuery<CoinMarketData[]>({
    queryKey: ['markets', limit],
    queryFn: () =>
      fetch(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      ).then(res => res.json()),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
  })
}

export const useTrendingCoins = () => {
  return useQuery<{ coins: TrendingCoin[] }>({
    queryKey: ['trending'],
    queryFn: () => fetch(`${BASE_URL}/search/trending`).then(res => res.json()),
    staleTime: 1000 * 60 * 10,
  })
}

// Mock Fear & Greed for now (real API requires paid)
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