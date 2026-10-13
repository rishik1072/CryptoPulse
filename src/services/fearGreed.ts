import { useQuery } from '@tanstack/react-query'

export interface FearGreedData {
  value: number
  value_classification: string
  timestamp: string
}

export const useFearGreedIndex = () => {
  return useQuery<FearGreedData>({
    queryKey: ['fear-greed'],
    queryFn: async () => {
      let res: Response
      try {
        res = await fetch('https://api.alternative.me/fng/?limit=1')
      } catch (err) {
        throw new Error(`Failed to fetch Fear & Greed index: ${(err as Error).message}`)
      }

      if (!res.ok) {
        throw new Error(`Fear & Greed index unavailable (HTTP ${res.status})`)
      }

      const data = await res.json()
      const item = data?.data?.[0]
      if (!item) {
        throw new Error('Malformed Fear & Greed index payload')
      }
      
      const parsedValue = parseInt(item.value, 10)
      return {
        value: Number.isFinite(parsedValue) ? parsedValue : 50,
        value_classification: item.value_classification || 'Neutral',
        timestamp: item.timestamp || String(Math.floor(Date.now() / 1000)),
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })
}