import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardTotals, type DashboardTotals } from '../api/analytics'
import { useTimerStore } from '../stores/timerStore'
import TimeDisplay from '../components/TimeDisplay'

type Period = 'today' | 'week' | 'month' | 'year'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardTotals | null>(null)
  const [period, setPeriod] = useState<Period>('today')
  const navigate = useNavigate()

  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  useEffect(() => {
    getDashboardTotals().then(setData)
  }, [])

  if (!data) return <div className="p-6 text-gray-400">Loading...</div>

  const totals: Record<Period, number> = {
    today: data.today_seconds,
    week: data.week_seconds,
    month: data.month_seconds,
    year: data.year_seconds,
  }

  const periodLabels: Record<Period, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }

  const activeProjectId = activeSession?.project_id

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="flex gap-2 mb-6">
        {(Object.keys(totals) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-sm text-gray-500">{periodLabels[period]}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
        <div className="text-4xl font-mono font-bold text-indigo-600">
          <TimeDisplay seconds={totals[period]} />
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Project Breakdown</h2>
      <div className="space-y-2">
        {data.projects
          .sort((a, b) => b[period] - a[period])
          .map((proj) => {
            const isActive = isRunning && activeProjectId === proj.id
            const time = proj[period] + (isActive ? elapsed : 0)
            const maxTime = Math.max(...data.projects.map((p) => p[period]), 1)
            const pct = maxTime > 0 ? (time / maxTime) * 100 : 0
            return (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                    <span className="font-medium text-sm">{proj.name}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                  <span className="font-mono text-sm text-gray-700">
                    <TimeDisplay seconds={time} />
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(Math.max(pct, 2), 100)}%`,
                      backgroundColor: proj.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        {data.projects.length === 0 && (
          <p className="text-sm text-gray-400">No projects yet.</p>
        )}
      </div>
    </div>
  )
}
