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
    <nav className="flex items-center gap-1.5 text-sm text-muted mb-6">
      <span className="hover:text-white cursor-pointer transition-colors">Dashboard</span>
      
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={index === segments.length - 1 ? "text-white font-medium" : "hover:text-white cursor-pointer transition-colors"}>
            {getLabel(segment)}
          </span>
        </div>
      ))}
    </nav>
  )
}