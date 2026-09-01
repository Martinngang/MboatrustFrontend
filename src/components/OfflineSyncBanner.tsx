import { useState, useEffect } from 'react'
import { FONT } from './MobileLayout'

export function OfflineSyncBanner({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncedRecently, setSyncedRecently] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncedRecently(true)
      setTimeout(() => setSyncedRecently(false), 3500)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setSyncedRecently(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !syncedRecently) return null

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg border flex items-center gap-2 text-xs transition-all animate-bounce ${className}`}
      style={{
        background: isOnline ? '#dcfce7' : '#fef3c7',
        borderColor: isOnline ? '#86efac' : '#fde047',
        color: isOnline ? '#15803d' : '#854d0e',
        fontFamily: FONT.sans,
      }}
    >
      <span className="text-sm">{isOnline ? '🟢' : '⚡'}</span>
      <span className="font-semibold">
        {isOnline
          ? 'Back Online · All project & escrow data synchronized'
          : 'Offline Mode Active · Changes safely saved to device'}
      </span>
    </div>
  )
}
