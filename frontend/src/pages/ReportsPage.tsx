import { useEffect, useState } from 'react'
import { getDailyReport, getWeeklyReport, getMonthlyReport } from '../api/reports'
import TimeDisplay from '../components/TimeDisplay'

type ReportType = 'daily' | 'weekly' | 'monthly'

interface ProjectDuration {
  name: string
  duration_seconds: number
}

interface DayDuration {
  date: string
  duration_seconds: number
}

interface DailyReport {
  date: string
  projects: ProjectDuration[]
  total_seconds: number
}

interface WeeklyReport {
  days: DayDuration[]
  total_seconds: number
}

interface MonthlyReport {
  year: number
  month: number
  projects: ProjectDuration[]
  total_seconds: number
}

type ReportData = DailyReport | WeeklyReport | MonthlyReport

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('daily')
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      let res
      if (type === 'daily') res = await getDailyReport()
      else if (type === 'weekly') res = await getWeeklyReport()
      else res = await getMonthlyReport()
      setData(res)
    }
    fetchData()
  }, [type])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="flex gap-2 mb-4">
        {(['daily', 'weekly', 'monthly'] as ReportType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-2 rounded text-sm ${type === t ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow p-4">
          {type === 'daily' && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{(data as DailyReport).date}</p>
              {(data as DailyReport).projects.map((p) => (
                <div key={p.name} className="flex justify-between py-1">
                  <span>{p.name}</span>
                  <TimeDisplay seconds={p.duration_seconds} />
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <TimeDisplay seconds={data.total_seconds} />
              </div>
            </div>
          )}
          {type === 'weekly' && (
            <div>
              {(data as WeeklyReport).days.map((d) => (
                <div key={d.date} className="flex justify-between py-1">
                  <span>{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                  <TimeDisplay seconds={d.duration_seconds} />
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <TimeDisplay seconds={data.total_seconds} />
              </div>
            </div>
          )}
          {type === 'monthly' && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{(data as MonthlyReport).month}/{(data as MonthlyReport).year}</p>
              {(data as MonthlyReport).projects.map((p) => (
                <div key={p.name} className="flex justify-between py-1">
                  <span>{p.name}</span>
                  <TimeDisplay seconds={p.duration_seconds} />
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <TimeDisplay seconds={data.total_seconds} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
