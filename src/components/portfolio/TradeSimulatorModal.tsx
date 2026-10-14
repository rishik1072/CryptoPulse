import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, CheckCircle2, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePortfolioStore } from '@/store/usePortfolioStore'

interface TradeSimulatorModalProps {
  isOpen: boolean
  onClose: () => void
  coinId: string
  symbol: string
  name: string
  image: string
  price: number
  initialMode?: 'buy' | 'sell'
}

type TradeMode = 'buy' | 'sell'
type ModalStep = 'form' | 'preview' | 'success'

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })

export function TradeSimulatorModal({
  isOpen,
  onClose,
  coinId,
  symbol,
  name,
  image,
  price,
  initialMode = 'buy',
}: TradeSimulatorModalProps) {
  const { holdings, addHolding, updateHolding, removeHolding } = usePortfolioStore()

  const [mode, setMode] = useState<TradeMode>(initialMode)
  const [quantity, setQuantity] = useState(1)
  const [feeRate, setFeeRate] = useState(0.25)
  const [slippage, setSlippage] = useState(0.5)
  const [step, setStep] = useState<ModalStep>('form')
  const [error, setError] = useState<string | null>(null)

  // Reset form state when modal opens or initialMode changes
  // Using a ref to track previous values and only reset when needed
  const prevIsOpenRef = useRef(isOpen)
  const prevInitialModeRef = useRef(initialMode)

  useEffect(() => {
    const wasClosed = !prevIsOpenRef.current && isOpen
    const modeChanged = prevInitialModeRef.current !== initialMode

    if (wasClosed || modeChanged) {
      setMode(initialMode)
      setQuantity(1)
      setFeeRate(0.25)
      setSlippage(0.5)
      setStep('form')
      setError(null)
    }

    prevIsOpenRef.current = isOpen
    prevInitialModeRef.current = initialMode
  }, [isOpen, initialMode])

  const existingHolding = holdings.find((holding) => holding.coinId === coinId)
  const availableQuantity = existingHolding?.quantity ?? 0

  const preview = useMemo(() => {
    const notional = quantity * price
    const fees = notional * (feeRate / 100)
    const slippageAmount = notional * (slippage / 100)
    const estimatedValue = mode === 'buy' ? notional + fees + slippageAmount : notional - fees - slippageAmount

    return {
      notional,
      fees,
      slippageAmount,
      estimatedValue,
      netUnits: mode === 'buy' ? quantity : Math.min(quantity, availableQuantity),
    }
  }, [availableQuantity, feeRate, mode, price, quantity, slippage])

  const handlePreview = useCallback(() => {
    if (!quantity || quantity <= 0) {
      setError('Enter a positive amount to continue.')
      return
    }

    if (mode === 'sell' && quantity > availableQuantity) {
      setError('You cannot simulate more than your current holding.')
      return
    }

    setError(null)
    setStep('preview')
  }, [quantity, mode, availableQuantity])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }

      if (event.key === 'Enter' && step === 'form') {
        event.preventDefault()
        handlePreview()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, step, onClose, handlePreview])

  const handleConfirm = async () => {
    if (!coinId) return

    if (mode === 'buy') {
      if (existingHolding) {
        const nextQuantity = existingHolding.quantity + quantity
        const nextAvgBuyPrice = (existingHolding.quantity * existingHolding.avgBuyPrice + quantity * price) / nextQuantity
        await updateHolding(existingHolding.id, {
          quantity: nextQuantity,
          avgBuyPrice: nextAvgBuyPrice,
        })
      } else {
        await addHolding({
          coinId,
          symbol: symbol.toUpperCase(),
          name,
          image,
          quantity,
          avgBuyPrice: price,
          purchaseDate: new Date().toISOString().split('T')[0],
        })
      }
    } else {
      if (!existingHolding) return

      const nextQuantity = existingHolding.quantity - quantity
      if (nextQuantity <= 0) {
        await removeHolding(existingHolding.id)
      } else {
        await updateHolding(existingHolding.id, { quantity: nextQuantity })
      }
    }

    setStep('success')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Trade simulator"
          className="w-full max-w-2xl my-6 rounded-xl border border-[#262D38] bg-[#151921] p-5 sm:p-6 text-[#F0F4F8] shadow-2xl overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-[#262D38] mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#00E676]">
                <ShieldCheck className="h-3.5 w-3.5" /> Simulator mode • zero financial risk
              </div>
              <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-[#F0F4F8] font-heading">
                {mode === 'buy' ? 'Simulate Buy' : 'Simulate Sell'} {name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] transition-colors cursor-pointer"
              aria-label="Close trade simulator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(['buy', 'sell'] as TradeMode[]).map((option) => {
              const isSelected = mode === option
              return (
                <button
                  key={option}
                  onClick={() => {
                    setMode(option)
                    setStep('form')
                    setError(null)
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer border ${
                    isSelected
                      ? option === 'buy'
                        ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                        : 'bg-[#FF5252]/15 text-[#FF5252] border-[#FF5252]/30'
                      : 'border-transparent text-[#94A3B8] hover:bg-[#1E232E] hover:text-[#F0F4F8]'
                  }`}
                >
                  {option === 'buy' ? 'Buy Order' : 'Sell Order'}
                </button>
              )
            })}
          </div>

          {step === 'form' && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3.5">
                <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#94A3B8] font-medium">Market price</div>
                      <div className="mt-0.5 text-xl font-bold font-mono text-[#F0F4F8] tabular-nums">{formatCurrency(price)}</div>
                    </div>
                    <div className="rounded-lg bg-[#00E676]/10 p-2 text-[#00E676] border border-[#00E676]/20">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-[#262D38] bg-[#151921] p-2.5">
                    <img src={image} alt={name} className="h-8 w-8 rounded-lg shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[#F0F4F8]">{name}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono uppercase">{symbol}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-3.5">
                  <label className="block text-xs font-medium text-[#94A3B8]">Simulated Quantity</label>
                  <input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs font-mono text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors tabular-nums"
                    placeholder="Enter quantity"
                  />
                  <div className="mt-1.5 text-[11px] text-[#94A3B8]">
                    {mode === 'buy'
                      ? 'Simulates adding units to your portfolio holdings.'
                      : `Current holding balance: ${availableQuantity.toFixed(4)} ${symbol.toUpperCase()}.`}
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-3.5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#94A3B8]">
                    <span>Simulator Fee</span>
                    <span className="font-mono text-[#F0F4F8] tabular-nums">{feeRate.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={feeRate}
                    onChange={(event) => setFeeRate(Number(event.target.value))}
                    className="mt-2.5 w-full accent-[#FFB300]"
                  />
                </div>

                <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-3.5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#94A3B8]">
                    <span>Estimated Slippage</span>
                    <span className="font-mono text-[#F0F4F8] tabular-nums">{slippage.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={slippage}
                    onChange={(event) => setSlippage(Number(event.target.value))}
                    className="mt-2.5 w-full accent-[#FFB300]"
                  />
                </div>

                <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F0F4F8]">
                    <Sparkles className="h-3.5 w-3.5 text-[#FFB300]" /> Valuation Estimate
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs text-[#94A3B8]">
                    <div className="flex items-center justify-between">
                      <span>Notional value</span>
                      <span className="font-mono font-medium text-[#F0F4F8] tabular-nums">{formatCurrency(preview.notional)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fees</span>
                      <span className="font-mono font-medium text-[#94A3B8] tabular-nums">{formatCurrency(preview.fees)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Slippage</span>
                      <span className="font-mono font-medium text-[#94A3B8] tabular-nums">{formatCurrency(preview.slippageAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="mt-4 space-y-3.5">
              <div className="rounded-xl border border-[#262D38] bg-[#1E232E] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Simulation Review</div>
                <div className="mt-3 space-y-2 text-xs text-[#94A3B8] font-mono tabular-nums">
                  <div className="flex items-center justify-between">
                    <span>Action</span>
                    <span className={`font-semibold uppercase ${mode === 'buy' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{mode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Units</span>
                    <span className="font-medium text-[#F0F4F8]">{preview.netUnits.toFixed(4)} {symbol.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated Total</span>
                    <span className="font-bold text-[#F0F4F8]">{formatCurrency(preview.estimatedValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fee Impact</span>
                    <span className="text-[#94A3B8]">{formatCurrency(preview.fees)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-[#00E676]/20 bg-[#00E676]/10 p-5 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E676]/20 text-[#00E676]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[#F0F4F8]">Simulation Complete</h3>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Your simulated {mode} order has been executed and updated in your local portfolio view.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 rounded-lg border border-[#FF5252]/20 bg-[#FF5252]/10 px-3.5 py-2 text-xs text-[#FF5252]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#262D38] pt-3.5">
            <div className="text-[11px] font-mono text-[#94A3B8]">
              Shortcut: Esc to close
            </div>

            <div className="flex items-center gap-2">
              {step === 'preview' && (
                <button
                  onClick={() => setStep('form')}
                  className="rounded-lg border border-[#262D38] bg-[#1E232E] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8] transition-colors cursor-pointer"
                >
                  Back to Edit
                </button>
              )}

              {step === 'form' && (
                <button
                  onClick={handlePreview}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
                >
                  <span>Preview Order</span>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-slate-950" />
                </button>
              )}

              {step === 'preview' && (
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-[#00E676] hover:bg-[#00c864] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#00E676]/15"
                >
                  Confirm Simulation
                </button>
              )}

              {step === 'success' && (
                <button
                  onClick={onClose}
                  className="rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
