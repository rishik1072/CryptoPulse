import { useAlertStore } from '@/store/useAlertStore'
import { X } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  symbol: z.string().min(1, 'Symbol required'),
  type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE', 'DAILY_HIGH', 'DAILY_LOW', 'VOLUME_SPIKE']),
  value: z.number().positive('Value must be greater than zero'),
})

type FormData = z.infer<typeof schema>

interface CreateAlertModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateAlertModal({ isOpen, onClose }: CreateAlertModalProps) {
  const { addAlert } = useAlertStore()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PRICE_ABOVE' },
  })

  const onSubmit = (data: FormData) => {
    addAlert({
      symbol: data.symbol.toUpperCase(),
      type: data.type,
      value: data.value,
      enabled: true,
    })
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create Price Alert"
    >
      <div className="w-full max-w-md rounded-xl border border-[#262D38] bg-[#151921] p-5 sm:p-6 text-[#F0F4F8] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#262D38] mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#F0F4F8] font-heading">Create Price Alert</h2>
            <p className="mt-0.5 text-xs text-[#94A3B8]">Configure target movement notifications</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#94A3B8] hover:text-[#F0F4F8] hover:bg-[#1E232E] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="alert-symbol" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Asset Symbol
            </label>
            <input
              id="alert-symbol"
              {...register('symbol')}
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] uppercase transition-colors"
              placeholder="BTC, ETH, SOL"
            />
            {errors.symbol && <p className="text-xs text-[#FF5252] mt-1">{errors.symbol.message}</p>}
          </div>

          <div>
            <label htmlFor="alert-type" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Condition Type
            </label>
            <select
              id="alert-type"
              {...register('type')}
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] transition-colors"
            >
              <option value="PRICE_ABOVE">Price Above ($)</option>
              <option value="PRICE_BELOW">Price Below ($)</option>
              <option value="PERCENT_CHANGE">24H % Change</option>
              <option value="DAILY_HIGH">Daily High ($)</option>
              <option value="DAILY_LOW">Daily Low ($)</option>
              <option value="VOLUME_SPIKE">Volume Spike ($)</option>
            </select>
          </div>

          <div>
            <label htmlFor="alert-value" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Target Value
            </label>
            <input
              id="alert-value"
              type="number"
              step="any"
              {...register('value', { valueAsNumber: true })}
              className="w-full rounded-lg border border-[#262D38] bg-[#0B0E14] px-3 py-2 text-xs text-[#F0F4F8] placeholder:text-[#94A3B8]/60 focus:outline-none focus:border-[#FFB300] focus:ring-1 focus:ring-[#FFB300] font-mono tabular-nums transition-colors"
              placeholder="e.g. 95000"
            />
            {errors.value && <p className="text-xs text-[#FF5252] mt-1">{errors.value.message}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-[#262D38] bg-[#1E232E] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:bg-[#262D38] hover:text-[#F0F4F8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}