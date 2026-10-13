import { useQuery } from '@tanstack/react-query'
import { ApiError, apiRetryConfig, fetchJsonSafely } from './coingecko.ts'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

/**
 * Validates, sorts chronologically, and deduplicates OHLC data points
 * to prevent crashes or render failures in lightweight-charts.
 */
export function sanitizeOHLCData(raw: unknown): OHLCData[] {
  if (!Array.isArray(raw)) return []

  const validPoints: OHLCData[] = []

  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 5) continue
    const [t, o, h, l, c] = item
    if (
      !Number.isFinite(t) ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c)
    ) {
      continue
    }
    if (t <= 0 || o <= 0 || h <= 0 || l <= 0 || c <= 0) {
      continue
    }

    const high = Math.max(h, o, c)
    const low = Math.min(l, o, c)

    validPoints.push({
      time: Math.floor(t),
      open: o,
      high,
      low,
      close: c,
    })
  }

  // Sort ascending by timestamp
  validPoints.sort((a, b) => a.time - b.time)

  // Deduplicate points with identical second-level timestamp
  const deduplicated: OHLCData[] = []
  for (const candle of validPoints) {
    const candleSec = Math.floor(candle.time / 1000)
    const last = deduplicated[deduplicated.length - 1]
    if (last && Math.floor(last.time / 1000) === candleSec) {
      last.high = Math.max(last.high, candle.high)
      last.low = Math.min(last.low, candle.low)
      last.close = candle.close
      last.time = candle.time
    } else {
      deduplicated.push({ ...candle })
    }
  }

  return deduplicated
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

      return sanitizeOHLCData(raw)
    },
    enabled: !!normalizedId,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    ...apiRetryConfig,
  })
}