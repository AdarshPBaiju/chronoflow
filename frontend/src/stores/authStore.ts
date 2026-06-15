import { create } from 'zustand'
import { getMe, getProfile, type User, type Profile } from '../api/auth'
import client, { setTokens, clearTokens, getAccessToken } from '../api/client'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  fetchUser: async () => {
    const token = getAccessToken()
    if (!token) {
      set({ user: null, profile: null, loading: false })
      return
    }
    try {
      const user = await getMe()
      const profile = await getProfile()
      set({ user, profile, loading: false })
    } catch {
      set({ user: null, profile: null, loading: false })
    }
  },
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  login: async (email, password) => {
    clearTokens()
    const { data } = await client.post('/auth/login/', { email, password })
    setTokens(data.access, data.refresh)
    const user = await getMe()
    const profile = await getProfile()
    set({ user, profile, loading: false })
  },
  register: async (email, password) => {
    clearTokens()
    const { data } = await client.post('/auth/register/', { email, password })
    setTokens(data.access, data.refresh)
    const profile = await getProfile()
    set({ user: data.user, profile, loading: false })
  },
  logout: () => {
    clearTokens()
    set({ user: null, profile: null })
    window.location.href = '/login'
  },
}))
