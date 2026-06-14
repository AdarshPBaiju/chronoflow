import client from './client'

export interface Session {
  id: number
  task: number
  task_title: string
  project_name: string
  project_color: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  note: string
  created_at: string
}

export async function getSessions(taskId?: number): Promise<Session[]> {
  const params: Record<string, number> = {}
  if (taskId) params.task_id = taskId
  const { data } = await client.get('/sessions/', { params })
  return data
}

export async function startTimer(taskId: number): Promise<Session> {
  const { data } = await client.post('/sessions/start/', { task_id: taskId })
  return data
}

export async function stopTimer(): Promise<Session> {
  const { data } = await client.post('/sessions/stop/')
  return data
}

export async function getActiveSession(): Promise<{ active: boolean; session: Session | null }> {
  const { data } = await client.get('/sessions/active/')
  return data
}

export async function createSession(s: Partial<Session>): Promise<Session> {
  const { data } = await client.post('/sessions/', s)
  return data
}
