import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, CheckCircle2, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { useUIStore } from '@/store/useUIStore'

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
  const { theme } = useUIStore()

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

  const isDark = theme === 'dark'
  const shellClasses = isDark
    ? 'border-white/10 bg-slate-950/90 text-white'
    : 'border-slate-200 bg-white/95 text-slate-900'
  const surfaceClasses = isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
  const inputClasses = isDark
    ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400'
    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Trade simulator"
          className={`w-full max-w-2xl rounded-[30px] border p-4 shadow-[0_40px_140px_-45px_rgba(0,0,0,0.8)] sm:p-6 ${shellClasses}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Simulator mode • no real exchange
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {mode === 'buy' ? 'Buy' : 'Sell'} {name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`rounded-2xl border p-2 transition ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-100 hover:bg-slate-200'}`}
              aria-label="Close trade simulator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['buy', 'sell'] as TradeMode[]).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setMode(option)
                  setStep('form')
                  setError(null)
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === option ? 'bg-white text-slate-950' : isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {option === 'buy' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>

          {step === 'form' && (
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-4">
                <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-400">Current price</div>
                      <div className="mt-1 text-2xl font-semibold">{formatCurrency(price)}</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                    <img src={image} alt={name} className="h-10 w-10 rounded-2xl" />
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-slate-400">{symbol.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                  <label className="text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${inputClasses}`}
                    placeholder="Enter quantity"
                  />
                  <div className="mt-2 text-sm text-slate-400">
                    {mode === 'buy' ? 'You are simulating a buy order.' : `You hold ${availableQuantity.toFixed(4)} ${symbol.toUpperCase()}.`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                  <label className="text-sm font-medium">Fees (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={feeRate}
                    onChange={(event) => setFeeRate(Number(event.target.value))}
                    className="mt-3 w-full accent-emerald-400"
                  />
                  <div className="mt-2 text-sm text-slate-400">{feeRate.toFixed(2)}% simulator fee</div>
                </div>

                <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                  <label className="text-sm font-medium">Slippage (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={slippage}
                    onChange={(event) => setSlippage(Number(event.target.value))}
                    className="mt-3 w-full accent-cyan-400"
                  />
                  <div className="mt-2 text-sm text-slate-400">{slippage.toFixed(2)}% expected move</div>
                </div>

                <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-amber-400" /> Preview summary
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Estimated value</span>
                      <span className="font-medium text-white">{formatCurrency(preview.notional)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fees</span>
                      <span className="font-medium text-white">{formatCurrency(preview.fees)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Slippage</span>
                      <span className="font-medium text-white">{formatCurrency(preview.slippageAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="mt-6 space-y-4">
              <div className={`rounded-[24px] border p-4 ${surfaceClasses}`}>
                <div className="text-sm font-medium">Order preview</div>
                <div className="mt-3 space-y-3 text-sm text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Action</span>
                    <span className="font-medium text-white">{mode === 'buy' ? 'Buy' : 'Sell'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Units</span>
                    <span className="font-medium text-white">{preview.netUnits.toFixed(4)} {symbol.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated value</span>
                    <span className="font-medium text-white">{formatCurrency(preview.estimatedValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fees</span>
                    <span className="font-medium text-white">{formatCurrency(preview.fees)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Slippage</span>
                    <span className="font-medium text-white">{formatCurrency(preview.slippageAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-5 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Simulation confirmed</h3>
              <p className="mt-2 text-sm text-slate-300">
                Your simulated {mode} order was recorded and your portfolio view has been updated.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="text-sm text-slate-400">
              Keyboard: Esc to close • Enter to preview
            </div>

            <div className="flex gap-3">
              {step === 'preview' && (
                <button
                  onClick={() => setStep('form')}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                >
                  Edit
                </button>
              )}

              {step === 'form' && (
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Preview <ArrowRightLeft className="h-4 w-4" />
                </button>
              )}

              {step === 'preview' && (
                <button
                  onClick={handleConfirm}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Confirm
                </button>
              )}

              {step === 'success' && (
                <button
                  onClick={onClose}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
