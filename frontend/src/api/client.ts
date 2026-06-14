import axios from 'axios'

const TOKEN_KEY = 'chronoflow_access'
const REFRESH_KEY = 'chronoflow_refresh'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      const refresh = localStorage.getItem(REFRESH_KEY)
      if (refresh) {
        err.config._retry = true
        try {
          const { data } = await axios.post('/api/auth/refresh/', { refresh })
          setTokens(data.access, refresh)
          err.config.headers.Authorization = `Bearer ${data.access}`
          return client(err.config)
        } catch {
          clearTokens()
          const authPages = ['/login', '/register', '/forgot-password']
          if (!authPages.includes(window.location.pathname)) {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(err)
  }
)

export default client
