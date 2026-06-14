import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface ApiError {
  response?: {
    data?: {
      email?: string[]
      password?: string[]
      detail?: string
    }
  }
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register(email, password)
      navigate('/')
    } catch (err: unknown) {
      const apiError = err as ApiError
      const msg = apiError.response?.data?.email?.[0]
        || apiError.response?.data?.password?.[0]
        || apiError.response?.data?.detail
        || 'Registration failed'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          required
        />
        <button type="submit" className="w-full bg-indigo-500 text-white rounded py-2 hover:bg-indigo-600">
          Register
        </button>
        <p className="text-sm text-center mt-4">
          <Link to="/login" className="text-indigo-500">Already have an account?</Link>
        </p>
      </form>
    </div>
  )
}
