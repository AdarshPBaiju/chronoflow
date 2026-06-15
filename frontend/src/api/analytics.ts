import client from './client'

export interface DailyTotal {
  date: string
  duration_seconds: number
  session_count: number
}

export interface DashboardTotals {
  today_seconds: number
  week_seconds: number
  month_seconds: number
  year_seconds: number
  projects: ProjectTime[]
  daily_totals: DailyTotal[]
}

export interface ProjectTime {
  id: number
  name: string
  color: string
  today: number
  week: number
  month: number
  year: number
}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  const { data } = await client.get('/analytics/dashboard/')
  return data
}

export async function getTimeByStage(projectId: number) {
  const { data } = await client.get('/analytics/by-stage/', {
    params: { project_id: projectId },
  })
  return data
}

export async function getTimeByTask(projectId: number) {
  const { data } = await client.get('/analytics/by-task/', {
    params: { project_id: projectId },
  })
  return data
}

export async function getTimeByProject() {
  const { data } = await client.get('/analytics/by-project/')
  return data
}
