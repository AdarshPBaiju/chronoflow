import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTimerStore } from '../stores/timerStore'
import { formatDurationA } from '../lib/time'
import { useUIStore } from '../stores/uiStore'
import { searchTasks, type Task } from '../api/tasks'
import TaskDrawer from './TaskDrawer'

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

  const { taskDrawerOpen, selectedTaskId, openTaskDrawer, closeTaskDrawer } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Task[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchActive()
  }, [fetchActive])

  useEffect(() => {
    document.title = isRunning ? `⏱ ${formatDurationA(elapsed)} - ChronoFlow` : 'ChronoFlow'
  }, [isRunning, elapsed])

  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      return
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchTasks(searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error("Search failed:", err)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

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
              className="w-full bg-white border-none h-9 pl-10 pr-4 text-[14px] leading-[20px] rounded-lg focus:ring-1 focus:ring-[#0051d5] outline-none text-black"
              placeholder="Global Search..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {/* Search Dropdown Overlay */}
            {showDropdown && searchQuery.trim() !== '' && (
              <div className="absolute top-[44px] left-0 w-full bg-white border border-[#c6c6cd] rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-[100] custom-scrollbar">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-[13px] text-[#45464d] italic">No tasks found</div>
                ) : (
                  <div className="py-1">
                    {searchResults.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          openTaskDrawer(task.id)
                          setShowDropdown(false)
                          setSearchQuery('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#f2f4f7] border-b border-[#f2f4f7]/50 last:border-0 transition-colors flex flex-col gap-0.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[13px] text-black truncate max-w-[200px]">
                            {task.code ? `[${task.code}] ` : ''}{task.title}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#45464d]">
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#45464d]">
                          <span className="truncate max-w-[220px] font-medium text-[#0051d5]">
                            {task.project_code ? `[${task.project_code}] ` : ''}{task.project_name || `Project #${task.project}`}
                          </span>
                          <span>•</span>
                          <span className="bg-[#eceef1] px-1 rounded text-[9px] font-semibold">
                            {task.column_name || 'No Stage'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Click-outside back-drop layer to close search overlay */}
            {showDropdown && (
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setShowDropdown(false)}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="flex items-center gap-3 bg-[#e8f0fe] border border-[#d2e3fc] px-3.5 py-1.5 rounded-lg shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col text-left max-w-[200px]">
                <span className="text-[10px] leading-[12px] font-bold text-[#1a73e8] uppercase tracking-wider">Active Timer</span>
                <span className="text-[12px] font-semibold text-black truncate mt-0.5" title={activeSession?.task_title || 'Task'}>
                  {activeSession?.task_code ? `[${activeSession.task_code}] ` : ''}{activeSession?.task_title || 'Task'}
                </span>
              </div>
              <span className="text-[14px] font-mono font-bold text-[#1a73e8] bg-white px-2 py-0.5 rounded border border-[#d2e3fc]">
                {formatDurationA(elapsed)}
              </span>
              <button
                onClick={async () => {
                  const stopTimerStore = useTimerStore.getState().stop
                  await stopTimerStore()
                }}
                className="bg-[#ba1a1a] hover:bg-[#93000a] text-white px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">stop</span>
                Stop
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#45464d] text-[12px] font-medium bg-[#f2f4f7] border border-[#c6c6cd]/30 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6cd]" />
              <span>Timer Idle</span>
            </div>
          )}
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

      {taskDrawerOpen && selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={closeTaskDrawer}
        />
      )}
    </div>
  )
}
