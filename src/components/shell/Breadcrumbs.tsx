import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context'
import { C, FONT } from '../MobileLayout'

interface Crumb { label: string; path?: string }

/** Route-pattern → trail resolver. Seeded for the highest-traffic sections
 * (Home, Projects list→detail, Tenders list→detail, Land list→detail,
 * Menu/Settings) — extend this table as more sections need it rather than
 * solving every one of the ~70 routes up front. */
function useBreadcrumbTrail(): Crumb[] {
  const { pathname } = useLocation()
  const { id } = useParams()
  const { projects, jobs, landListings } = useApp()

  if (pathname === '/home') return [{ label: 'Home' }]

  if (pathname.startsWith('/workspace/projects') || pathname.startsWith('/funder/browse')) {
    return [{ label: 'Home', path: '/home' }, { label: 'Projects' }]
  }
  if (pathname.startsWith('/funder/project/')) {
    const project = projects.find((p) => p.id === id)
    return [{ label: 'Home', path: '/home' }, { label: 'Projects', path: '/workspace/projects' }, { label: project?.title ?? 'Project' }]
  }
  if (pathname.startsWith('/funder/post-job')) {
    return [{ label: 'Home', path: '/home' }, { label: 'Projects', path: '/workspace/projects' }, { label: 'Post a tender' }]
  }

  if (pathname.startsWith('/workspace/jobs') || pathname.startsWith('/contractor/jobs')) {
    return [{ label: 'Home', path: '/home' }, { label: 'Tenders' }]
  }
  if (pathname.startsWith('/contractor/job/')) {
    const job = jobs.find((j) => j.id === id)
    // Not '/workspace/jobs' — that's the funder's own tender-management
    // board (RequireRole-gated to 'funder'), so a contractor clicking this
    // crumb would get bounced straight to /home instead of their job list.
    return [{ label: 'Home', path: '/home' }, { label: 'Tenders', path: '/contractor/jobs' }, { label: job?.title ?? 'Tender' }]
  }

  if (pathname.startsWith('/workspace/land') || pathname.startsWith('/land/browse')) {
    return [{ label: 'Home', path: '/home' }, { label: 'Land' }]
  }
  if (pathname.startsWith('/land/listing/')) {
    const listing = landListings.find((l) => l.id === id)
    return [{ label: 'Home', path: '/home' }, { label: 'Land', path: '/workspace/land' }, { label: listing?.title ?? 'Listing' }]
  }

  if (pathname.startsWith('/messages')) return [{ label: 'Home', path: '/home' }, { label: 'Messages' }]
  if (pathname.startsWith('/shared/settings')) return [{ label: 'Home', path: '/home' }, { label: 'Menu', path: '/shared/profile' }, { label: 'Settings' }]
  if (pathname.startsWith('/shared/profile')) return [{ label: 'Home', path: '/home' }, { label: 'Menu' }]
  if (pathname.startsWith('/admin')) return [{ label: 'Home', path: '/home' }, { label: 'Administration' }, { label: 'Admin panel' }]
  if (pathname.startsWith('/verifier')) return [{ label: 'Home', path: '/home' }, { label: 'Administration' }, { label: 'Verifier' }]

  return [{ label: 'Home', path: '/home' }]
}

export function Breadcrumbs() {
  const nav = useNavigate()
  const trail = useBreadcrumbTrail()

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto">
      {trail.map((crumb, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {i > 0 && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                <path d="M3.5 2L7 5L3.5 8" stroke={C.inkSubtle} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            {crumb.path && !isLast ? (
              <button
                onClick={() => nav(crumb.path!)}
                style={{ fontFamily: FONT.mono, color: C.inkSubtle }}
                className="text-[11px] uppercase tracking-wider hover:underline"
              >
                {crumb.label}
              </button>
            ) : (
              <span style={{ fontFamily: FONT.mono, color: isLast ? C.ink : C.inkSubtle }} className="text-[11px] uppercase tracking-wider truncate max-w-[220px]">
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
