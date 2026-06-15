import { useEffect, useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { getDailyReport, getWeeklyReport, getMonthlyReport, getDetailedReport } from '../api/reports'
import type { DetailedReport } from '../api/reports'
import PdfReport from '../lib/PdfReport'
import TimeDisplay from '../components/TimeDisplay'

type ReportType = 'daily' | 'weekly' | 'monthly'

interface ProjectDuration {
  name: string
  code?: string
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
  const [pdfData, setPdfData] = useState<DetailedReport | null>(null)

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

  const handleGeneratePdf = () => {
    getDetailedReport().then(setPdfData)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Reports</h1>
        {data && !pdfData && (
          <button
            onClick={handleGeneratePdf}
            className="flex items-center gap-1.5 bg-[#0051d5] hover:bg-[#003da6] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
            Export as PDF
          </button>
        )}
        {pdfData && (
          <PDFDownloadLink
            document={<PdfReport data={pdfData} />}
            fileName={`chronoflow-report-${pdfData.period.start_date}-${pdfData.period.end_date}.pdf`}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">download_done</span>
            Download PDF
          </PDFDownloadLink>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(['daily', 'weekly', 'monthly'] as ReportType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPdfData(null) }}
            className={`px-4 py-2 rounded text-sm ${type === t ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {data && (
        <div className="bg-white rounded-lg shadow p-6 border border-[#c6c6cd]">
          {type === 'daily' && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{(data as DailyReport).date}</p>
              {(data as DailyReport).projects.map((p) => (
                <div key={p.name} className="flex justify-between py-1">
                  <span>{p.code ? `[${p.code}] ` : ''}{p.name}</span>
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
                  <span>{p.code ? `[${p.code}] ` : ''}{p.name}</span>
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
