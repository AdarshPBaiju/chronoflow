import client from './client'

export interface DashboardTotals {
  today_seconds: number
  week_seconds: number
  month_seconds: number
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
