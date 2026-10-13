import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useMarketData, searchCoinGecko, type CoinSearchResult } from '@/services/coingecko'
import { resolveCoinCandidate, type ResolvedAssetCandidate } from '@/services/priceResolver'
import { GlassCard } from '@/components/ui/GlassCard'
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

      const success = addHolding({
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
        setResolveError('Failed to save holding. Please verify the quantity and price inputs.')
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <GlassCard className="w-full max-w-lg my-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="font-semibold text-xl text-slate-900 dark:text-white">Add Asset to Portfolio</div>
            <p className="text-xs text-slate-500 mt-0.5">Verified against real CoinGecko market assets</p>
          </div>
          <button onClick={handleModalClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resolveError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{resolveError}</div>
          </div>
        )}

        {/* Coin Selector Search Bar */}
        <div className="mb-5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Search Cryptocurrency</label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ticker (e.g. Cardano, ADA, Solana)..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-3.5 h-4 w-4 animate-spin text-violet-500" />
            )}
          </div>

          {/* Quick Selection Chips */}
          <div className="mt-2.5 max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60 p-1">
            {displayedList.length > 0 ? (
              displayedList.map((coin) => {
                const isChosen = selectedAsset?.id === coin.id
                return (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => handleSelectCoin(coin)}
                    className={`flex w-full items-center justify-between rounded-xl p-2 text-left text-xs transition ${
                      isChosen ? 'bg-violet-600 text-white font-medium' : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {coin.image ? (
                        <img src={coin.image} alt="" className="h-5 w-5 rounded-full shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-slate-300 flex items-center justify-center text-[9px] font-bold">
                          {coin.symbol.slice(0, 2)}
                        </div>
                      )}
                      <span className="truncate">{coin.name}</span>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${isChosen ? 'text-violet-200' : 'text-slate-400'}`}>
                        ({coin.symbol})
                      </span>
                    </div>
                    {isChosen ? (
                      <Check className="h-4 w-4 shrink-0 text-white" />
                    ) : coin.currentPrice ? (
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        ${coin.currentPrice >= 1 ? coin.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : coin.currentPrice.toFixed(4)}
                      </span>
                    ) : null}
                  </button>
                )
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                {isSearching ? 'Searching CoinGecko database…' : 'No matching coins found. Try typing a ticker symbol.'}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Symbol</label>
              <input
                {...register('symbol')}
                className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                placeholder="BTC"
              />
              {errors.symbol && <p className="text-xs text-rose-500 mt-1">{errors.symbol.message}</p>}
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Coin Name</label>
              <input
                {...register('name')}
                className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Bitcoin"
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Quantity</label>
              <input
                type="number"
                step="any"
                {...register('quantity', { valueAsNumber: true })}
                className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                placeholder="1.5"
              />
              {errors.quantity && <p className="text-xs text-rose-500 mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Avg Buy Price (USD)</label>
              <input
                type="number"
                step="any"
                {...register('avgBuyPrice', { valueAsNumber: true })}
                className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                placeholder="65000"
              />
              {errors.avgBuyPrice && <p className="text-xs text-rose-500 mt-1">{errors.avgBuyPrice.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400">Purchase Date</label>
            <input
              type="date"
              {...register('purchaseDate')}
              className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            {errors.purchaseDate && <p className="text-xs text-rose-500 mt-1">{errors.purchaseDate.message}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400">Notes (Optional)</label>
            <input
              type="text"
              {...register('notes')}
              placeholder="e.g. DCA on exchange, Ledger cold storage"
              className="w-full mt-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-5 rounded-2xl bg-slate-900 py-3 font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying &amp; Adding…
              </>
            ) : (
              'Add to Portfolio'
            )}
          </button>
        </form>
      </GlassCard>
    </div>
  )
}