import { useEffect, useState } from 'react'
import { getProjects, type Project } from '../api/projects'
import { getTasks, type Task } from '../api/tasks'
import { getSessions, type Session } from '../api/sessions'
import { useTimerStore } from '../stores/timerStore'
import { useUIStore } from '../stores/uiStore'
import { formatDurationA } from '../lib/time'

export default function TimerPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProject, setSelectedProject] = useState<number | ''>('')
  const [selectedTask, setSelectedTask] = useState<number | ''>('')
  const [allSessions, setAllSessions] = useState<Session[]>([])

  const { isRunning, elapsed, activeSession, fetchActive, start, stop, updateVersion } = useTimerStore()
  const { openTaskDrawer: openDrawer } = useUIStore()

  const activeTask = activeSession?.task
  const activeProject = activeSession?.project_id
  const isThisTaskActive = isRunning && activeTask === selectedTask

  const activeProjectDetails = projects.find((p) => p.id === activeProject)

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      await fetchActive()
      const projectList = await getProjects()
      if (cancelled) return
      const currentSession = useTimerStore.getState().activeSession
      setProjects(projectList)
      if (currentSession) {
        setSelectedProject(currentSession.project_id)
        setSelectedTask(currentSession.task)
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [fetchActive])

  useEffect(() => {
    if (!activeSession) return
    let cancelled = false

    const syncActiveSelection = async () => {
      await Promise.resolve()
      if (cancelled) return
      setSelectedProject(activeSession.project_id)
      setSelectedTask(activeSession.task)
    }

    void syncActiveSelection()

    return () => {
      cancelled = true
    }
  }, [activeSession])

  useEffect(() => {
    let cancelled = false

    const loadTasks = async () => {
      if (!selectedProject) {
        if (!cancelled) setTasks([])
        return
      }
      const projectTasks = await getTasks(selectedProject as number)
      if (!cancelled) setTasks(projectTasks)
    }

    void loadTasks()

    return () => {
      cancelled = true
    }
  }, [selectedProject, updateVersion])

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      if (!selectedTask) {
        if (!cancelled) setAllSessions([])
        return
      }
      const taskSessions = await getSessions(selectedTask as number)
      if (!cancelled) setAllSessions(taskSessions)
    }

    void loadSessions()

    return () => {
      cancelled = true
    }
  }, [selectedTask, updateVersion])

  const handleStart = async () => {
    if (!selectedTask) return
    if (isRunning && activeTask !== selectedTask) {
      await stop()
    }
    await start(selectedTask as number)
  }

  const handleStop = async () => {
    await stop()
  }



  const completedSeconds = allSessions
    .filter((s) => s.end_time)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const totalAllSeconds = isThisTaskActive ? completedSeconds + elapsed : completedSeconds

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-[24px] leading-[32px] font-semibold tracking-[-0.01em] text-black">Time Tracking</h2>
          <p className="text-[13px] leading-[18px] text-[#45464d]">Log your operational activities in real-time.</p>
        </div>
      </header>

      {/* Active Timer Card */}
      {isRunning && activeSession && (
        <section className="bg-white border border-[#c6c6cd] p-4 flex items-center justify-between shadow-[0px_4px_12px_rgba(15,23,42,0.08)] relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0051d5]" />
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#0051d5] font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0051d5] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0051d5]" />
                </span>
                Active Tracking
              </span>
              <h3 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-black my-1">{formatDurationA(elapsed)}</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[#45464d] text-[13px] leading-[18px]">
                  <span className="material-symbols-outlined text-[16px]">folder</span>
                  <span>{activeProjectDetails?.name || `Project #${activeProject}`}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-[#c6c6cd]" />
                <div className="flex items-center gap-1 text-[#45464d] text-[13px] leading-[18px] font-medium">
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span>{activeSession.task_title || `Task #${activeTask}`}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (activeTask) openDrawer(activeTask) }}
              className="h-12 w-12 rounded bg-[#e6e8eb] flex items-center justify-center hover:bg-[#c6c6cd] transition-colors"
            >
              <span className="material-symbols-outlined text-black">open_in_new</span>
            </button>
            <button
              onClick={handleStop}
              className="h-12 px-6 bg-[#ba1a1a] text-white font-bold rounded flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97]"
            >
              <span className="material-symbols-outlined">stop</span>
              Stop Session
            </button>
          </div>
        </section>
      )}

      {/* Main Workspace: Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Timer Card */}
        <section className="col-span-12 lg:col-span-8 bg-white border border-[#c6c6cd] p-8 rounded flex flex-col items-center justify-center space-y-8 min-h-[420px]">
          <div className="text-center space-y-2">
            <p className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] uppercase tracking-widest text-[#003ea8]">
              {isRunning ? 'System Status: Recording...' : 'System Status: Idle'}
            </p>
            <div className="font-bold text-[84px] leading-none text-black selection:bg-[#0051d5]/20" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em' }}>
              {isRunning ? formatDurationA(elapsed) : '00:00:00'}
            </div>
          </div>

          <div className="w-full max-w-lg grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d] ml-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => { setSelectedProject(Number(e.target.value) || ''); setSelectedTask('') }}
                className="w-full bg-[#f2f4f7] border border-[#c6c6cd] rounded-lg p-3 text-[14px] leading-[20px] focus:ring-2 focus:ring-[#0051d5] outline-none"
                disabled={isRunning}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d] ml-1">Activity Type</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(Number(e.target.value) || '')}
                className="w-full bg-[#f2f4f7] border border-[#c6c6cd] rounded-lg p-3 text-[14px] leading-[20px] focus:ring-2 focus:ring-[#0051d5] outline-none"
                disabled={isRunning}
              >
                <option value="">Select activity</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            {isThisTaskActive ? (
              <button
                onClick={handleStop}
                className="w-48 h-14 bg-[#ba1a1a] text-white text-[18px] leading-[26px] font-semibold rounded-full flex items-center justify-center gap-3 shadow-lg shadow-[#ba1a1a]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">stop</span>
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!selectedTask}
                className={`w-48 h-14 text-white text-[18px] leading-[26px] font-semibold rounded-full flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 transition-all ${
                  selectedTask
                    ? isRunning
                      ? 'bg-[#e6a800] shadow-[#e6a800]/20'
                      : 'bg-[#0051d5] shadow-[#0051d5]/20'
                    : 'bg-[#c6c6cd] cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">play_arrow</span>
                <span>{isRunning ? 'Switch Timer' : 'Start Timer'}</span>
              </button>
            )}
          </div>
        </section>

        {/* Daily Summary & Stats */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="bg-[#131b2e] text-white p-6 rounded flex flex-col justify-between flex-1">
            <div>
              <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium opacity-70 uppercase tracking-wider">Total Logged</p>
              <h3 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] mt-1">
                {selectedTask ? (totalAllSeconds > 0 ? formatDurationA(totalAllSeconds) : '00:00:00') : '00:00:00'}
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium opacity-70">Equivalent</p>
                <p className="text-[16px] leading-[24px] font-semibold">
                  {selectedTask ? `${(totalAllSeconds / 3600).toFixed(2)}h / ${Math.floor(totalAllSeconds / 60)}m` : '0.00h / 0m'}
                </p>
              </div>
              <span className="material-symbols-outlined text-4xl opacity-20">speed</span>
            </div>
          </div>
          <div className="bg-white border border-[#c6c6cd] p-6 rounded flex-1">
            <h4 className="text-[16px] leading-[24px] font-semibold mb-4 text-black">Task Details</h4>
            {selectedTask ? (
              <div className="space-y-3">
                <div className="flex justify-between text-[12px] leading-[16px] font-semibold tracking-[0.02em]">
                  <span className="text-[#45464d]">Sessions</span>
                  <span className="text-black">{allSessions.length} total</span>
                </div>
                <div className="flex justify-between text-[12px] leading-[16px] font-semibold tracking-[0.02em]">
                  <span className="text-[#45464d]">Completed</span>
                  <span className="text-black">{allSessions.filter((s) => s.end_time).length}</span>
                </div>
                <div className="flex justify-between text-[12px] leading-[16px] font-semibold tracking-[0.02em]">
                  <span className="text-[#45464d]">Active</span>
                  <span className="text-black">{allSessions.filter((s) => !s.end_time).length}</span>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-[18px] text-[#45464d]">Select a project and activity to view details.</p>
            )}
          </div>
        </aside>

        {/* Sessions Table */}
        <section className="col-span-12 bg-white border border-[#c6c6cd] rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-[#c6c6cd] flex justify-between items-center bg-[#f2f4f7]">
            <h4 className="text-[16px] leading-[24px] font-semibold text-black">Session Activity</h4>
            {selectedTask && (
              <div className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">
                {allSessions.length} {allSessions.length === 1 ? 'session' : 'sessions'}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f7f9fc] text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] border-b border-[#c6c6cd]">
                  <th className="px-6 py-3 font-semibold">Time Interval</th>
                  <th className="px-6 py-3 font-semibold">Duration</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c6cd]">
                {selectedTask && allSessions.map((s) => {
                  const start = new Date(s.start_time)
                  const end = s.end_time ? new Date(s.end_time) : null
                  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const endStr = end
                    ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'now'
                  const isActive = isRunning && activeSession?.id === s.id
                  const duration = isActive ? elapsed : (s.duration_seconds ?? 0)
                  return (
                    <tr key={s.id} className="hover:bg-[#f7f9fc] transition-colors group">
                      <td className="px-6 py-3 text-[12px] leading-[16px] font-mono">
                        {startStr} → {endStr}
                      </td>
                      <td className="px-6 py-3 text-[16px] leading-[24px] font-semibold">
                        {isActive ? (
                          <span className="text-[#0051d5] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {formatDurationA(duration)}
                          </span>
                        ) : (
                          formatDurationA(duration)
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] leading-[16px] font-semibold tracking-[0.02em]">
                          {isActive ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-green-600">Completed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openDrawer(s.task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#e0e3e6] rounded material-symbols-outlined text-[18px] text-[#45464d]"
                        >
                          open_in_new
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!selectedTask && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-[#c6c6cd] mb-3">timer</span>
              <p className="text-[14px] leading-[20px] text-[#45464d]">Select a project and activity to view session logs.</p>
            </div>
          )}
          {selectedTask && allSessions.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-[#c6c6cd] mb-3">history</span>
              <p className="text-[14px] leading-[20px] text-[#45464d]">No sessions logged for this task.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
