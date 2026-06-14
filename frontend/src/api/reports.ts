import client from './client'

export interface ProjectReport {
  project: {
    id: number
    name: string
    color: string
    status: string
  }
  total_seconds: number
  stage_totals: {
    column_id: number
    name: string
    color: string
    duration_seconds: number
  }[]
  task_totals: {
    task_id: number
    title: string
    column_id: number | null
    column_name: string
    duration_seconds: number
    session_count: number
  }[]
  daily_totals: {
    date: string
    duration_seconds: number
    session_count: number
  }[]
}

export async function getDailyReport(date?: string) {
  const { data } = await client.get('/reports/daily/', {
    params: date ? { date } : {},
  })
  return data
}

export async function getWeeklyReport() {
  const { data } = await client.get('/reports/weekly/')
  return data
}

export async function getMonthlyReport(year?: number, month?: number) {
  const params: Record<string, number> = {}
  if (year) params.year = year
  if (month) params.month = month
  const { data } = await client.get('/reports/monthly/', { params })
  return data
}

export async function getProjectReport(projectId: number): Promise<ProjectReport> {
  const { data } = await client.get(`/reports/projects/${projectId}/`)
  return data
}
