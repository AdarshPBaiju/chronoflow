import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTimerStore } from '../stores/timerStore'
import { formatDurationA } from '../lib/time'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/projects', label: 'Projects', icon: 'folder_open' },
  { path: '/timer', label: 'Timer', icon: 'timer' },
  { path: '/reports', label: 'Reports', icon: 'assessment' },
]

export default function Layout() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const isRunning = useTimerStore((s) => s.isRunning)
  const elapsed = useTimerStore((s) => s.elapsed)
  const activeSession = useTimerStore((s) => s.activeSession)
  const fetchActive = useTimerStore((s) => s.fetchActive)

  useEffect(() => {
    fetchActive()
  }, [fetchActive])

  useEffect(() => {
    document.title = isRunning ? `⏱ ${formatDurationA(elapsed)} - ChronoFlow` : 'ChronoFlow'
  }, [isRunning, elapsed])

  const handleLogout = async () => {
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e]">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full h-[64px] bg-[#e0e3e6] flex items-center justify-between px-6 z-50 border-b border-[#c6c6cd]">
        <div className="flex items-center gap-4">
          <span className="text-[24px] leading-[32px] font-bold tracking-[-0.01em] text-black">ChronoFlow</span>
          <div className="h-6 w-px bg-[#c6c6cd]/50 mx-2" />
          <div className="relative w-[320px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d] text-[18px]">search</span>
            <input
              className="w-full bg-white border-none h-9 pl-10 pr-4 text-[14px] leading-[20px] rounded-lg focus:ring-1 focus:ring-[#0051d5] outline-none"
              placeholder="Global Search..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#eceef1] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-black">notifications</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-[#eceef1] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-black">help</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-[#eceef1] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-black">settings</span>
          </button>
          <div className="h-8 w-px bg-[#c6c6cd]/50 mx-2" />
          <div className="flex items-center gap-2 cursor-pointer hover:bg-[#e6e8eb] px-2 py-1 rounded-lg transition-all">
            <div className="w-8 h-8 rounded-full bg-[#dbe1ff] flex items-center justify-center text-[#0051d5] font-bold text-xs border border-[#c6c6cd]">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden lg:block">
              <p className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#191c1e]">{user?.username || 'User'}</p>
              <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-[64px] h-[calc(100vh-96px)] w-[280px] bg-[#eceef1] flex flex-col py-4 border-r border-[#c6c6cd] z-40 overflow-y-auto">
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0051d5] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            </div>
            <div>
              <h2 className="text-[16px] leading-[24px] font-semibold text-black">Time Tracking</h2>
              <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Workflow Aware</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-3 py-2.5 text-[12px] leading-[16px] font-semibold tracking-[0.02em] transition-all ${
                  isActive
                    ? 'border-l-2 border-[#0051d5] bg-[#0051d5]/10 text-[#0051d5]'
                    : 'text-[#45464d] hover:text-[#191c1e] hover:bg-[#e6e8eb] rounded-lg border-l-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-[20px]">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#c6c6cd]/30 space-y-1">
          {isRunning && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold text-green-700 tracking-[0.02em]">Running</span>
              </div>
              <p className="text-xs text-green-600 truncate">{activeSession?.task_title || 'Task'}</p>
              <p className="text-lg font-mono font-bold text-green-700 mt-1">{formatDurationA(elapsed)}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] hover:text-[#191c1e] rounded-lg transition-all"
          >
            <span className="material-symbols-outlined mr-3 text-[20px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="ml-[280px] mt-[64px] mb-[32px] min-h-[calc(100vh-96px)] p-6 flex flex-col gap-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full h-[32px] bg-[#d8dadd] flex items-center justify-between px-6 z-50 border-t border-[#c6c6cd]">
        <div className="flex items-center gap-4">
          <span className="text-[12px] leading-[16px] text-[#191c1e]">System Status: Operational</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d] hover:text-[#0051d5] cursor-pointer transition-colors">v1.0.0-stable</span>
          <span className="w-px h-3 bg-[#c6c6cd] mx-1" />
          <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Server: Local</span>
        </div>
      </footer>
    </div>
  )
}
