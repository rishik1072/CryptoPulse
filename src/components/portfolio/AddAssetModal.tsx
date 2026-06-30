import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePortfolioStore } from '@/store/usePortfolioStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { X } from 'lucide-react'

const schema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  avgBuyPrice: z.number().positive('Price must be positive'),
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
    }
  })

  const onSubmit = (data: FormData) => {
    addHolding({
      coinId: data.symbol.toLowerCase(),
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      image: `https://assets.coingecko.com/coins/images/1/large/${data.symbol.toLowerCase()}.png`,
      quantity: data.quantity,
      avgBuyPrice: data.avgBuyPrice,
      purchaseDate: data.purchaseDate,
      notes: data.notes,
    })
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <GlassCard className="w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="font-semibold text-xl">Add Asset</div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="text-xs text-muted">Symbol</label>
            <input {...register('symbol')} className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" placeholder="BTC" />
            {errors.symbol && <p className="text-xs text-danger mt-1">{errors.symbol.message}</p>}
          </div>

          <div>
            <label className="text-xs text-muted">Coin Name</label>
            <input {...register('name')} className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" placeholder="Bitcoin" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted">Quantity</label>
              <input type="number" step="any" {...register('quantity', { valueAsNumber: true })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted">Avg Buy Price</label>
              <input type="number" step="any" {...register('avgBuyPrice', { valueAsNumber: true })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted">Purchase Date</label>
            <input type="date" {...register('purchaseDate')} className="w-full mt-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" />
          </div>

          <button 
            type="submit"
            className="w-full mt-4 bg-white text-black py-3 rounded-2xl font-medium hover:bg-white/90 transition-all"
          >
            Add to Portfolio
          </button>
        </form>
      </GlassCard>
    </div>
  )
}