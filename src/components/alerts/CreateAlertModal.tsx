import { useAlertStore } from '@/store/useAlertStore'
import { X } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GlassCard } from '@/components/ui/GlassCard'

const schema = z.object({
  symbol: z.string().min(2, 'Symbol required'),
  type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE', 'DAILY_HIGH', 'DAILY_LOW', 'VOLUME_SPIKE']),
  value: z.number().positive(),
})

type FormData = z.infer<typeof schema>

interface CreateAlertModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateAlertModal({ isOpen, onClose }: CreateAlertModalProps) {
  const { addAlert } = useAlertStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PRICE_ABOVE' }
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <GlassCard className="w-full max-w-md mx-4">
        <div className="flex justify-between mb-6">
          <div className="font-semibold text-xl">Create Alert</div>
          <button onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="text-xs text-muted">Symbol</label>
            <input {...register('symbol')} className="input" placeholder="BTC" />
            {errors.symbol && <p className="text-xs text-danger mt-1">{errors.symbol.message}</p>}
          </div>

          <div>
            <label className="text-xs text-muted">Alert Type</label>
            <select {...register('type')} className="input">
              <option value="PRICE_ABOVE">Price Above</option>
              <option value="PRICE_BELOW">Price Below</option>
              <option value="PERCENT_CHANGE">% Change</option>
              <option value="DAILY_HIGH">Daily High</option>
              <option value="DAILY_LOW">Daily Low</option>
              <option value="VOLUME_SPIKE">Volume Spike</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted">Value</label>
            <input type="number" step="any" {...register('value', { valueAsNumber: true })} className="input" />
            {errors.value && <p className="text-xs text-danger mt-1">{errors.value.message}</p>}
          </div>

          <button type="submit" className="w-full mt-4 bg-white text-black py-3 rounded-2xl font-medium">
            Create Alert
          </button>
        </form>
      </GlassCard>
    </div>
  )
}