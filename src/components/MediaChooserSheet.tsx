import { C, FONT } from './tokens'

// The single entry point for adding milestone evidence — tapping the
// evidence area always opens this chooser first (camera-first: the
// contractor picks Camera or Upload Media before anything else happens,
// never forced into one or the other ahead of time). Two clear options,
// nothing else, mirrors the mobile ARCameraCapture/MediaChooserSheet 1:1.
export function MediaChooserSheet({
  visible,
  onClose,
  onChooseCamera,
  onChooseUpload,
}: {
  visible: boolean
  onClose: () => void
  onChooseCamera: () => void
  onChooseUpload: () => void
}) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
        style={{ background: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold text-center mb-1">
          Add evidence
        </div>

        <button
          onClick={onChooseCamera}
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
          style={{ background: C.forest }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" stroke="white" strokeWidth="1.5" />
              <path d="M2 6a2 2 0 012-2h1l1-1.5h6L13 4h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: FONT.sans, color: '#fff' }} className="text-sm font-semibold">Camera</div>
            <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-xs">Take a photo or record a video now</div>
          </div>
        </button>

        <button
          onClick={onChooseUpload}
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left border-2"
          style={{ background: C.parchment, borderColor: C.parchmentDark }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.forest + '18' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="12" height="12" rx="1.5" stroke={C.forest} strokeWidth="1.5" />
              <rect x="6" y="7" width="12" height="12" rx="1.5" stroke={C.forest} strokeWidth="1.5" fill={C.white} />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">Upload Media</div>
            <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Choose existing photos or videos</div>
          </div>
        </button>

        <button onClick={onClose} className="w-full py-3 text-center" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
