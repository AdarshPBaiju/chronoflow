import client from './client'

export interface WorkflowColumn {
  id: number
  project: number
  name: string
  position: number
  color: string
  is_completed: boolean
  wip_limit: number | null
  created_at: string
}

export async function getColumnsByProject(projectId: number): Promise<WorkflowColumn[]> {
  const { data } = await client.get('/workflow-columns/by_project/', {
    params: { project_id: projectId },
  })
  return data
}

export async function createColumn(c: Partial<WorkflowColumn>): Promise<WorkflowColumn> {
  const { data } = await client.post('/workflow-columns/', c)
  return data
}

export async function updateColumn(id: number, c: Partial<WorkflowColumn>): Promise<WorkflowColumn> {
  const { data } = await client.patch(`/workflow-columns/${id}/`, c)
  return data
}

export async function deleteColumn(id: number) {
  await client.delete(`/workflow-columns/${id}/`)
}
