import client from './client'
import type { Session } from './sessions'

export interface Task {
  id: number
  project: number
  column: number | null
  column_name: string
  title: string
  description: string
  priority: string
  estimated_seconds: number | null
  is_archived: boolean
  today_time: number
  total_time: number
  task_start: string | null
  task_end: string | null
  is_active: boolean
  sessions: Session[]
  movements: TaskMovement[]
  created_at: string
  updated_at: string
}

export interface TaskMovement {
  id: number
  from_column: number | null
  from_column_name: string
  to_column: number | null
  to_column_name: string
  moved_at: string
}

export async function getTasks(projectId: number): Promise<Task[]> {
  const { data } = await client.get('/tasks/', { params: { project_id: projectId } })
  return data
}

export async function getTasksByColumn(projectId: number, columnId: number): Promise<Task[]> {
  const { data } = await client.get('/tasks/', {
    params: { project_id: projectId, column_id: columnId },
  })
  return data
}

export async function createTask(t: Partial<Task>): Promise<Task> {
  const { data } = await client.post('/tasks/', t)
  return data
}

export async function updateTask(id: number, t: Partial<Task>): Promise<Task> {
  const { data } = await client.patch(`/tasks/${id}/`, t)
  return data
}

export async function moveTask(id: number, columnId: number): Promise<Task> {
  const { data } = await client.post(`/tasks/${id}/move/`, { column_id: columnId })
  return data
}

export async function deleteTask(id: number) {
  await client.delete(`/tasks/${id}/`)
}
