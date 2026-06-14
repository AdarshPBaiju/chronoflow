import { useEffect, useState } from 'react'
import { getDailyReport, getWeeklyReport, getMonthlyReport } from '../api/reports'
import TimeDisplay from '../components/TimeDisplay'

type ReportType = 'daily' | 'weekly' | 'monthly'

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('daily')
  const [data, setData] = useState<any>(null)

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
              <p className="text-sm text-gray-500 mb-2">{data.date}</p>
              {data.projects?.map((p: any) => (
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
              {data.days?.map((d: any) => (
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
              <p className="text-sm text-gray-500 mb-2">{data.month}/{data.year}</p>
              {data.projects?.map((p: any) => (
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
