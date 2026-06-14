import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTimerStore } from '../stores/timerStore'
import { formatDurationA } from '../lib/time'
import TimerWidget from './TimerWidget'
import client from '../api/client'

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const navigate = useNavigate()
  const isRunning = useTimerStore((s) => s.isRunning)
  const elapsed = useTimerStore((s) => s.elapsed)

  useEffect(() => {
    if (isRunning) {
      document.title = `⏱ ${formatDurationA(elapsed)} - ChronoFlow`
    } else {
      document.title = 'ChronoFlow'
    }
  }, [isRunning, elapsed])

  const handleLogout = async () => {
    await client.post('/auth/logout/')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`bg-white border-r ${sidebarOpen ? 'w-56' : 'w-12'} transition-all`}>
        <div className="p-4">
          <h2 className={`font-bold text-indigo-600 ${sidebarOpen ? '' : 'hidden'}`}>ChronoFlow</h2>
        </div>
        <nav className="px-2 space-y-1">
          <button onClick={() => navigate('/')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">
            {sidebarOpen ? 'Dashboard' : 'D'}
          </button>
          <button onClick={() => navigate('/projects')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">
            {sidebarOpen ? 'Projects' : 'P'}
          </button>
          <button onClick={() => navigate('/timer')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">
            {sidebarOpen ? 'Timer' : 'T'}
          </button>
          <button onClick={() => navigate('/reports')} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm">
            {sidebarOpen ? 'Reports' : 'R'}
          </button>
          {sidebarOpen && (
            <>
              <hr className="my-2" />
              <p className="text-xs text-gray-400 px-3">{user?.email}</p>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 rounded text-sm">
                Logout
              </button>
            </>
          )}
        </nav>
        <button
          onClick={toggleSidebar}
          className="absolute bottom-4 left-2 text-gray-400 hover:text-gray-600 text-xs"
        >
          {sidebarOpen ? '<<' : '>>'}
        </button>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <Outlet />
        </div>
        <TimerWidget />
      </main>
    </div>
  )
}
