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
      const res = await fetch('https://api.alternative.me/fng/?limit=1')
      const data = await res.json()
      const item = data.data[0]
      
      return {
        value: parseInt(item.value),
        value_classification: item.value_classification,
        timestamp: item.timestamp,
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
    retry: 2,
  })
}