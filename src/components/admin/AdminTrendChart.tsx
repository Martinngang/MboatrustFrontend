import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { C, FONT } from '../MobileLayout'
import type { DailyPoint } from '../../api/admin'

/** One consistent chart look reused across every admin trend surface — no
 * legend (single series, self-explanatory from the card title next to it),
 * a soft area fill under the line, and axis/grid colors pulled from the
 * theme tokens so it adapts to dark mode automatically like everything
 * else in the app. */
export function AdminTrendChart({ data, color = C.forest, formatValue = (v: number) => String(v), height = 180 }: {
  data: DailyPoint[]
  color?: string
  formatValue?: (v: number) => string
  height?: number
}) {
  const gradientId = `admin-trend-${color.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.parchmentDark} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontFamily: FONT.mono, fontSize: 9, fill: C.inkSubtle }}
          axisLine={{ stroke: C.parchmentDark }}
          tickLine={false}
          interval={Math.ceil(data.length / 7)}
        />
        <YAxis
          tick={{ fontFamily: FONT.mono, fontSize: 9, fill: C.inkSubtle }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={formatValue}
        />
        <Tooltip
          formatter={(v) => formatValue(Number(v))}
          labelFormatter={(d) => String(d)}
          contentStyle={{ background: C.white, border: `1px solid ${C.parchmentDark}`, borderRadius: 12, fontFamily: FONT.sans, fontSize: 12 }}
          labelStyle={{ fontFamily: FONT.mono, color: C.inkSubtle, fontSize: 10 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
