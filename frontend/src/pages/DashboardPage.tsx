import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardTotals, getTimeByStage, type DashboardTotals } from '../api/analytics'
import { useTimerStore } from '../stores/timerStore'
import TimeDisplay from '../components/TimeDisplay'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'year'

const PERIODS: Period[] = ['today', 'week', 'month', 'year']
const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
}

const CHART_COLORS = ['#0051d5', '#16a34a', '#d97706', '#7c3aed', '#0d9488', '#dc2626', '#0891b2', '#d946ef']

function fmtHms(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

interface StageData {
  name: string
  color: string
  duration_seconds: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardTotals | null>(null)
  const [period, setPeriod] = useState<Period>('today')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [stageData, setStageData] = useState<StageData[] | null>(null)
  const navigate = useNavigate()

  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  useEffect(() => {
    getDashboardTotals().then((res) => {
      setData(res)
      if (res.projects.length > 0) {
        setSelectedProjectId(res.projects[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStageData(null)
    getTimeByStage(selectedProjectId).then((stages) => {
      setStageData(stages)
    })
  }, [selectedProjectId])

  if (!data) return <div className="p-6 text-gray-400">Loading...</div>

  const totals: Record<Period, number> = {
    today: data.today_seconds,
    week: data.week_seconds,
    month: data.month_seconds,
    year: data.year_seconds,
  }

  const activeProjectId = activeSession?.project_id
  const sortedProjects = [...data.projects].sort((a, b) => b[period] - a[period])
  const maxProjectTime = Math.max(...data.projects.map((p) => p[period]), 1)

  const pieData = sortedProjects
    .filter((p) => p[period] > 0)
    .map((p, i) => ({
      name: p.name,
      value: p[period],
      color: p.color || CHART_COLORS[i % CHART_COLORS.length],
    }))

  const dailyData = data.daily_totals.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    hours: Math.round((d.duration_seconds / 3600) * 100) / 100,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-sm text-gray-500">{PERIOD_LABELS[period]}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
        <div className="text-4xl font-mono font-bold text-indigo-600">
          <TimeDisplay seconds={totals[period]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Daily Trend (14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}h`} />
              <Tooltip formatter={(value) => [`${value as number}h`, 'Hours']} />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]} fill="#0051d5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Project Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [fmtHms(value as number), 'Time']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
              No time logged this {period}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {stageData && stageData.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Stage Breakdown
            {selectedProjectId && (
              <span className="text-gray-400 font-normal ml-2">
                &mdash; {data.projects.find((p) => p.id === selectedProjectId)?.name}
              </span>
            )}
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(80, stageData.length * 36)}>
            <BarChart
              data={stageData.map((s) => ({ name: s.name, hours: Math.round((s.duration_seconds / 3600) * 100) / 100, color: s.color }))}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(val) => [`${val as number}h`, 'Hours']} />
              <Bar dataKey="hours" radius={[0, 3, 3, 0]} barSize={16}>
                {stageData.map((entry, i) => (
                  <Cell key={entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Project Breakdown</h2>
      <div className="space-y-2">
        {sortedProjects.map((proj) => {
          const isActive = isRunning && activeProjectId === proj.id
          const time = proj[period] + (isActive ? elapsed : 0)
          const pct = maxProjectTime > 0 ? (time / maxProjectTime) * 100 : 0
          return (
            <div
              key={proj.id}
              onClick={() => {
                navigate(`/projects/${proj.id}/overview`)
              }}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedProjectId === proj.id ? 'ring-2 ring-indigo-400' : ''
              }`}
              onMouseEnter={() => setSelectedProjectId(proj.id)}
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
