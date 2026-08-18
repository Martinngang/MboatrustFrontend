import { useNavigate } from 'react-router-dom'
import { useApp, type LandListing } from '../context'
import { C, FONT } from './MobileLayout'

const PIN_POSITIONS = [{ x: '28%', y: '38%' }, { x: '68%', y: '28%' }, { x: '58%', y: '68%' }]

/** Mini map showing nearby verified listings and a mock recently-completed sale, for context on where a listing sits relative to the local market. */
export function NeighboringListingsMap({ listing }: { listing: LandListing }) {
  const nav = useNavigate()
  const { landListings } = useApp()
  const others = landListings.filter((l) => l.id !== listing.id).slice(0, 2)
  const mockSoldPrice = Math.round((listing.price * 0.9) / 100000) * 100000

  const pins: { key: string; label: string; onClick?: () => void; color: string; textColor: string }[] = [
    ...others.map((l) => ({ key: l.id, label: `${(l.price / 1000000).toFixed(0)}M`, onClick: () => nav(`/land/listing/${l.id}`), color: l.verified ? C.forest : C.amber, textColor: l.verified ? '#fff' : C.forestDark })),
    { key: 'sold', label: `${(mockSoldPrice / 1000000).toFixed(1)}M · Sold`, color: C.inkSubtle, textColor: '#fff' },
  ]

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: '220px', background: '#E8F0E9' }}>
      <img
        src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=300&fit=crop&auto=format"
        alt="Map context"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'rgba(15,27,20,0.3)' }} />

      <div className="absolute flex flex-col items-center" style={{ left: '45%', top: '52%', transform: 'translate(-50%, -100%)' }}>
        <div className="rounded-full px-2.5 py-1 text-[9px] font-bold mb-1 whitespace-nowrap" style={{ background: C.seal, color: '#fff', fontFamily: FONT.mono }}>
          This listing
        </div>
        <div className="w-3 h-3 rounded-full border-2" style={{ background: C.seal, borderColor: C.white }} />
      </div>

      {pins.map((p, i) => (
        <button
          key={p.key}
          onClick={p.onClick}
          className="absolute flex flex-col items-center"
          style={{ left: PIN_POSITIONS[i].x, top: PIN_POSITIONS[i].y, transform: 'translate(-50%, -100%)', cursor: p.onClick ? 'pointer' : 'default' }}
        >
          <div className="rounded-full px-2 py-1 text-[9px] font-bold mb-1 whitespace-nowrap" style={{ background: p.color, color: p.textColor, fontFamily: FONT.mono }}>
            {p.label}
          </div>
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
        </button>
      ))}
    </div>
  )
}
