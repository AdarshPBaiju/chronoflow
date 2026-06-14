import client from './client'

export interface Note {
  id: number
  task: number
  user: number | null
  user_name: string
  content: string
  created_at: string
}

export async function getNotes(taskId: number): Promise<Note[]> {
  const { data } = await client.get('/notes/', { params: { task_id: taskId } })
  return data
}

export async function createNote(n: Partial<Note>): Promise<Note> {
  const { data } = await client.post('/notes/', n)
  return data
}

export async function deleteNote(id: number) {
  await client.delete(`/notes/${id}/`)
}
