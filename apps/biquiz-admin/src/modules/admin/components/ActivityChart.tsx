import React from 'react'
import { format, parseISO } from 'date-fns'

export type DailyActivity = {
  day: string
  sessions: number
  devices: number
  quiz_starts: number
  quiz_completes: number
}

type Props = {
  data: DailyActivity[]
}

const SERIES = [
  { key: 'devices', label: 'Active devices', className: 'bg-indigo-500' },
  { key: 'quiz_starts', label: 'Quizzes started', className: 'bg-emerald-400' },
] as const

const ActivityChart = ({ data }: Props) => {
  const max = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => d[s.key])))
  const labelEvery = Math.ceil(data.length / 10)

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-slate-500 dark:text-slate-400">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.className}`} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1 h-48">
        {data.map((d) => (
          <div
            key={d.day}
            className="group relative flex-1 flex items-end justify-center gap-px h-full"
          >
            {SERIES.map((s) => (
              <div
                key={s.key}
                className={`w-1/2 max-w-[14px] rounded-t ${s.className}`}
                style={{ height: `${(d[s.key] / max) * 100}%`, minHeight: d[s.key] ? 2 : 0 }}
              />
            ))}
            <div className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
              <p className="font-semibold">{format(parseISO(d.day), 'dd/MM/yyyy')}</p>
              <p>{d.devices} devices · {d.sessions} sessions</p>
              <p>{d.quiz_starts} started · {d.quiz_completes} completed</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 text-center text-[10px] text-slate-400">
            {i % labelEvery === 0 ? format(parseISO(d.day), 'dd/MM') : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ActivityChart
