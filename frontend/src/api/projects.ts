import client from './client'

export interface Project {
  id: number
  code?: string
  name: string
  description: string
  color: string
  status: string
  task_count: number
  total_time: number
  created_at: string
  updated_at: string
}

export async function getProjects(): Promise<Project[]> {
  const { data } = await client.get('/projects/')
  return data
}

export async function getProject(id: number): Promise<Project> {
  const { data } = await client.get(`/projects/${id}/`)
  return data
}

export async function createProject(p: Partial<Project>): Promise<Project> {
  const { data } = await client.post('/projects/', p)
  return data
}

export async function updateProject(id: number, p: Partial<Project>): Promise<Project> {
  const { data } = await client.patch(`/projects/${id}/`, p)
  return data
}

export async function deleteProject(id: number) {
  await client.delete(`/projects/${id}/`)
}
