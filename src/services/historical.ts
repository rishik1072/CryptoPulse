import { useQuery } from '@tanstack/react-query'
import { ApiError, apiRetryConfig, fetchJsonSafely } from './coingecko'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export const useOHLCData = (coinId: string, days: number) => {
  const normalizedId = coinId?.trim().toLowerCase()

  return useQuery<OHLCData[]>({
    queryKey: ['ohlc', normalizedId, days],
    queryFn: async () => {
      if (!normalizedId) return []

      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(normalizedId)}/ohlc?vs_currency=usd&days=${days}`
      const raw = await fetchJsonSafely<unknown>(url, `OHLC data for ${normalizedId}`)

      if (!Array.isArray(raw)) {
        throw new ApiError('Unexpected OHLC response format: expected a 2D array')
      }

      return raw
        .filter((item): item is number[] => Array.isArray(item) && item.length >= 5 && item.every(Number.isFinite))
        .map((item) => ({
          time: item[0],
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
        }))
    },
    enabled: !!normalizedId,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    ...apiRetryConfig,
  })
}