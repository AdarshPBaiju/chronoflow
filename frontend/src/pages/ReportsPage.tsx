import { useEffect, useState } from 'react'
import { getDetailedReport } from '../api/reports'
import { getProjects, type Project } from '../api/projects'
import type { DetailedReport } from '../api/reports'
import TimeDisplay from '../components/TimeDisplay'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStart(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function buildParams(startDate: string, endDate: string, projectIds: number[]): Record<string, string> {
  const params: Record<string, string> = { start_date: startDate, end_date: endDate }
  if (projectIds.length > 0) {
    params.project_ids = projectIds.join(',')
  }
  return params
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])
  const [report, setReport] = useState<DetailedReport | null>(null)
  const [fetching, setFetching] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getProjects().then(setProjects)
  }, [])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true)
    const params = buildParams(startDate, endDate, selectedProjectIds)
    getDetailedReport(params)
      .then((data) => {
        if (!cancelled) {
          setReport(data)
          setFetching(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [startDate, endDate, selectedProjectIds])

  const handleExportPdf = async () => {
    if (!report) return
    setExporting(true)
    try {
      const [{ default: PdfReport }, { pdf }] = await Promise.all([
        import('../lib/PdfReport'),
        import('@react-pdf/renderer'),
      ])
      const blob = await pdf(<PdfReport data={report} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const periodStr = `${report.period.start_date}-${report.period.end_date}`.replace(/[/:]/g, '-')
      a.download = `chronoflow-report-${periodStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Reports</h1>
        {report && (
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-[#0051d5] hover:bg-[#003da6] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              {exporting ? 'hourglass_top' : 'download_for_offline'}
            </span>
            {exporting ? 'Generating...' : 'Export as PDF'}
          </button>
        )}
      </div>

      <div className="bg-white border border-[#c6c6cd] rounded-lg p-4 mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#45464d] uppercase mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-[#c6c6cd] rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#45464d] uppercase mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-[#c6c6cd] rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#45464d] uppercase mb-1">Projects</label>
          <select
            multiple
            value={selectedProjectIds.map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => Number(o.value))
              setSelectedProjectIds(selected)
            }}
            className="border border-[#c6c6cd] rounded px-3 py-1.5 text-sm min-w-[180px] h-[120px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `[${p.code}] ${p.name}` : p.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#45464d] mt-1">
            {selectedProjectIds.length === 0
              ? 'All projects'
              : `${selectedProjectIds.length} selected`}
          </p>
        </div>
      </div>

      {fetching && (
        <div className="text-center py-8 text-[#45464d]">Loading report data...</div>
      )}

      {report && !fetching && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-5">
            <h2 className="text-[16px] font-semibold text-black mb-3">Executive Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-[#45464d] uppercase font-semibold">Total Hours</p>
                <p className="text-2xl font-bold"><TimeDisplay seconds={report.summary.total_seconds} /></p>
              </div>
              <div>
                <p className="text-[11px] text-[#45464d] uppercase font-semibold">Sessions</p>
                <p className="text-2xl font-bold">{report.summary.total_sessions}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#45464d] uppercase font-semibold">Projects</p>
                <p className="text-2xl font-bold">{report.summary.total_projects}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#45464d] uppercase font-semibold">Tasks</p>
                <p className="text-2xl font-bold">{report.summary.total_tasks}</p>
              </div>
            </div>
          </div>

          {report.projects.length > 0 && (
            <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b bg-[#f2f4f7]">
                <h3 className="text-[16px] font-semibold">Projects</h3>
              </div>
              <div className="divide-y">
                {report.projects.map((p) => (
                  <div key={p.id} className="px-5 py-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-black">{p.name}</span>
                      <TimeDisplay seconds={p.total_seconds} />
                    </div>
                    {p.stages.map((st) => (
                      <div key={st.name} className="flex justify-between py-0.5 text-sm ml-4">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color || '#c6c6cd' }} />
                          {st.name}
                        </span>
                        <TimeDisplay seconds={st.duration_seconds} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.projects.length === 0 && (
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center text-sm text-[#45464d]">
              No data found for the selected period and filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
