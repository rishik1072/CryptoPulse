import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useMarketData, searchCoinGecko, type CoinSearchResult } from '@/services/coingecko'
import { resolveCoinCandidate, type ResolvedAssetCandidate } from '@/services/priceResolver'
import { X, Search, Check, AlertCircle, Loader2 } from 'lucide-react'

const schema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(15, 'Symbol too long'),
  name: z.string().min(1, 'Coin name is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  avgBuyPrice: z.number().min(0, 'Price cannot be negative'),
  purchaseDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddAssetModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAssetModal({ isOpen, onClose }: AddAssetModalProps) {
  const { addHolding } = usePortfolioStore()
  const { data: cachedMarkets = [] } = useMarketData(50)

  const [selectedAsset, setSelectedAsset] = useState<ResolvedAssetCandidate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<ResolvedAssetCandidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  })

  // Fast suggestions from cached top market data when typing
  const localCandidates = useMemo(() => {
    const list = !searchQuery.trim()
      ? cachedMarkets.slice(0, 5)
      : cachedMarkets
          .filter((c) => {
            const q = searchQuery.trim().toLowerCase()
            return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
          })
          .slice(0, 5)

    return list.map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      image: c.image,
      currentPrice: c.current_price,
    }))
  }, [searchQuery, cachedMarkets])

  // Debounced CoinGecko remote search when query is typed
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      return
    }

    let active = true

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const coins: CoinSearchResult[] = await searchCoinGecko(trimmed)
        if (!active) return

        const formatted: ResolvedAssetCandidate[] = coins.slice(0, 6).map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol.toUpperCase(),
          image: c.large || c.thumb || '',
        }))
        setRemoteResults(formatted)
      } catch {
        // Graceful error recovery: fallback remains active
      } finally {
        if (active) setIsSearching(false)
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery])

  const handleSelectCoin = (coin: ResolvedAssetCandidate) => {
    setSelectedAsset(coin)
    setResolveError(null)
    setValue('symbol', coin.symbol)
    setValue('name', coin.name)
    if (coin.currentPrice && coin.currentPrice > 0) {
      setValue('avgBuyPrice', coin.currentPrice)
    }
  }

  const handleModalClose = () => {
    reset()
    setSelectedAsset(null)
    setSearchQuery('')
    setRemoteResults([])
    setResolveError(null)
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setResolveError(null)

    try {
      let resolved = selectedAsset

      // If user typed symbol directly without clicking suggestion, resolve it reliably
      if (!resolved || resolved.symbol !== data.symbol.toUpperCase()) {
        const sym = data.symbol.trim()
        const searchMatches = await searchCoinGecko(sym)
        resolved = resolveCoinCandidate(sym, cachedMarkets, searchMatches)
      }

      if (!resolved || !resolved.id) {
        setResolveError(
          `Could not verify "${data.symbol}" on CoinGecko. Please select a verified cryptocurrency from the search results.`
        )
        setIsSubmitting(false)
        return
      }

      const success = await addHolding({
        coinId: resolved.id,
        symbol: resolved.symbol.toUpperCase(),
        name: resolved.name || data.name,
        image: resolved.image,
        quantity: data.quantity,
        avgBuyPrice: data.avgBuyPrice,
        purchaseDate: data.purchaseDate,
        notes: data.notes,
      })

      if (success) {
        handleModalClose()
      } else {
        const storeErr = usePortfolioStore.getState().error
        setResolveError(storeErr || 'Failed to save holding. Please verify the quantity and price inputs.')
      }
    } catch {
      setResolveError('Network error while verifying cryptocurrency. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isQueryActive = searchQuery.trim().length >= 2
  const displayedList = isQueryActive && remoteResults.length > 0
    ? remoteResults
    : localCandidates

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Add Asset to Portfolio"
    >
      <div className="w-full max-w-lg my-8 rounded-xl border border-[#262D38] bg-[#151921] p-5 sm:p-6 text-[#F0F4F8] shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center pb-3.5 border-b border-[#262D38] mb-4">
          <div>
            <div className="font-semibold text-base text-[#F0F4F8] font-heading">Add Asset to Portfolio</div>
            <p className="text-xs text-[#94A3B8] mt-0.5">Verified against active market data</p>
          </div>
          <button
            onClick={handleModalClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {resolveError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#FF5252]/20 bg-[#FF5252]/10 p-3 text-xs text-[#FF5252]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{resolveError}</div>
          </div>
        )}

        {/* Coin Selector Search Bar */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Search Cryptocurrency</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ticker (e.g. Cardano, ADA, Solana)..."
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] pl-9 pr-8 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#FFB300]" />
            )}
          </div>

          {/* Quick Selection Chips */}
          <div className="mt-2 max-h-36 overflow-y-auto divide-y divide-[#262D38]/50 rounded-lg border border-[#262D38] bg-[#0B0E14]/80 p-1">
            {displayedList.length > 0 ? (
              displayedList.map((coin) => {
                const isChosen = selectedAsset?.id === coin.id
                return (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => handleSelectCoin(coin)}
                    className={`flex w-full items-center justify-between rounded-md p-2 text-left text-xs transition cursor-pointer ${
                      isChosen
                        ? 'bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30 font-medium'
                        : 'hover:bg-[#1E232E] text-[#94A3B8] hover:text-[#F0F4F8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {coin.image ? (
                        <img src={coin.image} alt="" className="h-5 w-5 rounded-full shrink-0 bg-[#0B0E14]" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-[#1E232E] border border-[#262D38] flex items-center justify-center text-[9px] font-bold text-[#94A3B8]">
                          {coin.symbol.slice(0, 2)}
                        </div>
                      )}
                      <span className="truncate text-[#F0F4F8]">{coin.name}</span>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider ${
                          isChosen ? 'text-[#FFB300]' : 'text-[#94A3B8]'
                        }`}
                      >
                        ({coin.symbol})
                      </span>
                    </div>
                    {isChosen ? (
                      <Check className="h-4 w-4 shrink-0 text-[#FFB300]" />
                    ) : coin.currentPrice ? (
                      <span className="font-mono text-[11px] text-[#94A3B8] shrink-0 tabular-nums">
                        ${coin.currentPrice >= 1
                          ? coin.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : coin.currentPrice.toFixed(4)}
                      </span>
                    ) : null}
                  </button>
                )
              })
            ) : (
              <div className="p-3 text-center text-xs text-[#94A3B8]">
                {isSearching ? 'Searching CoinGecko database…' : 'No matching coins found. Try typing a ticker symbol.'}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Symbol</label>
              <input
                {...register('symbol')}
                className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] uppercase focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                placeholder="BTC"
              />
              {errors.symbol && <p className="text-xs text-[#FF5252] mt-1">{errors.symbol.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Coin Name</label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
                placeholder="Bitcoin"
              />
              {errors.name && <p className="text-xs text-[#FF5252] mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                {...register('quantity', { valueAsNumber: true })}
                className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-mono text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors tabular-nums"
                placeholder="1.5"
              />
              {errors.quantity && <p className="text-xs text-[#FF5252] mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Avg Buy Price (USD)</label>
              <input
                type="number"
                step="any"
                {...register('avgBuyPrice', { valueAsNumber: true })}
                className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-mono text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors tabular-nums"
                placeholder="65000"
              />
              {errors.avgBuyPrice && <p className="text-xs text-[#FF5252] mt-1">{errors.avgBuyPrice.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Purchase Date</label>
            <input
              type="date"
              {...register('purchaseDate')}
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
            />
            {errors.purchaseDate && <p className="text-xs text-[#FF5252] mt-1">{errors.purchaseDate.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Notes (Optional)</label>
            <input
              type="text"
              {...register('notes')}
              placeholder="e.g. Cold storage, DCA order"
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleModalClose}
              className="inline-flex items-center justify-center rounded-lg border border-[#262D38] bg-[#1E232E] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#FFB300]/15"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" /> Verifying…
                </>
              ) : (
                'Add to Portfolio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}