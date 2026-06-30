import { useQuery } from '@tanstack/react-query'

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export const useOHLCData = (coinId: string, days: number) => {
  return useQuery<OHLCData[]>({
    queryKey: ['ohlc', coinId, days],
    queryFn: async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
      )
      const data = await res.json()
      
      return data.map((item: number[]) => ({
        time: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }))
    },
    enabled: !!coinId,
    staleTime: 1000 * 60 * 15,
    retry: 2,
  })
}