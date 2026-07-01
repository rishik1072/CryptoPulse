import { ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  
  const getLabel = (segment: string) => {
    if (segment === '') return 'Overview'
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  return (
    <nav className="mb-6 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-500 shadow-sm backdrop-blur">
      <span className="cursor-pointer rounded-full px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900">Dashboard</span>

      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={index === segments.length - 1 ? 'rounded-full px-2 py-1 font-medium text-slate-900' : 'cursor-pointer rounded-full px-2 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900'}>
            {getLabel(segment)}
          </span>
        </div>
      ))}
    </nav>
  )
}