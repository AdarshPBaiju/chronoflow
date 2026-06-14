import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardTotals, type DashboardTotals } from '../api/analytics'
import { getProjects, type Project } from '../api/projects'
import TimeDisplay from '../components/TimeDisplay'

export default function DashboardPage() {
  const [totals, setTotals] = useState<DashboardTotals | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardTotals().then(setTotals)
    getProjects().then(setProjects)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Today</p>
          {totals && <TimeDisplay seconds={totals.today_seconds} />}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">This Week</p>
          {totals && <TimeDisplay seconds={totals.week_seconds} />}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">This Month</p>
          {totals && <TimeDisplay seconds={totals.month_seconds} />}
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Projects</h2>
      <div className="grid grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`)}
            className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <h3 className="font-semibold">{p.name}</h3>
            </div>
            <p className="text-sm text-gray-500">{p.task_count} Tasks</p>
            <TimeDisplay seconds={p.total_time} />
            <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
