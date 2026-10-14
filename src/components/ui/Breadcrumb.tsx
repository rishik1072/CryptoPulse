import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const getLabel = (segment: string) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
      <Link to="/" className="hover:text-slate-200 transition-colors">
        Dashboard
      </Link>

      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`
        const isLast = index === segments.length - 1

        return (
          <div key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            {isLast ? (
              <span className="font-medium text-slate-200">{getLabel(segment)}</span>
            ) : (
              <Link to={path} className="hover:text-slate-200 transition-colors">
                {getLabel(segment)}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}