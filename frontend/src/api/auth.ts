import client from './client'

export interface User {
  id: number
  email: string
  username: string
}

export interface Profile {
  timezone: string
  theme: string
  time_display_mode: string
}

export async function getMe(): Promise<User> {
  const { data } = await client.get('/auth/me/')
  return data
}

export async function getProfile(): Promise<Profile> {
  const { data } = await client.get('/auth/profile/')
  return data
}

export async function updateProfile(p: Partial<Profile>) {
  const { data } = await client.patch('/auth/profile/', p)
  return data
}
