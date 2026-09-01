import { useState, useEffect } from 'react'
import { C, FONT } from './MobileLayout'

interface CityWeather {
  city: string
  tempC: number
  condition: string
  icon: string
  timeOffsetHours: number // Cameroon is UTC+1 (WAT)
}

const CAMEROON_CITIES: CityWeather[] = [
  { city: 'Yaoundé', tempC: 28, condition: 'Partly Cloudy', icon: '⛅', timeOffsetHours: 1 },
  { city: 'Douala', tempC: 31, condition: 'Humid / Light Rain', icon: '🌦️', timeOffsetHours: 1 },
  { city: 'Kribi', tempC: 29, condition: 'Coastal Breeze', icon: '🌊', timeOffsetHours: 1 },
  { city: 'Bafoussam', tempC: 24, condition: 'Highland Clear', icon: '☀️', timeOffsetHours: 1 },
  { city: 'Garoua', tempC: 36, condition: 'Sunny / Dry', icon: '☀️', timeOffsetHours: 1 },
]

export function SiteWeatherHeader({ className = '' }: { className?: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [localTime, setLocalTime] = useState('')

  const activeCity = CAMEROON_CITIES[selectedIdx]

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // Cameroon is UTC+1
      const utc = now.getTime() + now.getTimezoneOffset() * 60000
      const cameroonDate = new Date(utc + 3600000 * 1)
      setLocalTime(
        cameroonDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const nextCity = () => {
    setSelectedIdx((prev) => (prev + 1) % CAMEROON_CITIES.length)
  }

  return (
    <button
      onClick={nextCity}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95 ${className}`}
      style={{ background: C.cream, borderColor: C.parchmentDark }}
      title="Click to cycle Cameroon site cities"
    >
      <span className="text-sm">{activeCity.icon}</span>
      <div className="flex flex-col text-left leading-none">
        <div style={{ fontFamily: FONT.sans }} className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
          <span>{activeCity.city}</span>
          <span style={{ color: C.forest }}>{activeCity.tempC}°C</span>
        </div>
        <div style={{ fontFamily: FONT.mono }} className="text-[9px] text-slate-500 mt-0.5">
          {localTime} WAT · {activeCity.condition}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 font-bold ml-1">⇄</span>
    </button>
  )
}
