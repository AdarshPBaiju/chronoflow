import { useEffect, useState } from 'react'
import { getProjects, type Project } from '../api/projects'
import { getTasks, type Task } from '../api/tasks'
import { getSessions, type Session } from '../api/sessions'
import { useTimerStore } from '../stores/timerStore'
import { useUIStore } from '../stores/uiStore'
import { formatDurationA } from '../lib/time'
import TimeDisplay from '../components/TimeDisplay'

export default function TimerPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedProject, setSelectedProject] = useState<number | ''>('')
  const [selectedTask, setSelectedTask] = useState<number | ''>('')
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [initialized, setInitialized] = useState(false)

  const { isRunning, elapsed, activeSession, start, stop } = useTimerStore()
  const openDrawer = useUIStore((s) => s.openTaskDrawer)

  const activeTask = activeSession?.task
  const activeProject = activeSession?.project_id
  const isThisTaskActive = isRunning && activeTask === selectedTask

  // On mount: load projects, then auto-set to active session
  useEffect(() => {
    getProjects().then((p) => {
      setProjects(p)
      if (activeSession) {
        setSelectedProject(activeSession.project_id)
      }
      setInitialized(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When activeSession changes on mount or after stop, auto-select
  useEffect(() => {
    if (initialized && activeSession) {
      setSelectedProject(activeSession.project_id)
      setSelectedTask(activeSession.task)
    }
  }, [initialized, activeSession])

  // Load tasks when project changes
  useEffect(() => {
    if (!selectedProject) {
      setTasks([])
      return
    }
    getTasks(selectedProject as number).then(setTasks)
  }, [selectedProject])

  // Load today's sessions when task changes
  useEffect(() => {
    if (!selectedTask) {
      setTodaySessions([])
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    getSessions(selectedTask as number).then((sessions) => {
      setTodaySessions(sessions.filter((s) => s.start_time.startsWith(today)))
    })
  }, [selectedTask])

  const handleStart = async () => {
    if (!selectedTask) return
    // If another task is running, stop it first
    if (isRunning && activeTask !== selectedTask) {
      await stop()
    }
    await start(selectedTask as number)
  }

  const handleStop = async () => {
    await stop()
  }

  const completedToday = todaySessions
    .filter((s) => s.end_time)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const todayTotal = isThisTaskActive ? completedToday + elapsed : completedToday

  const activeProjectDetails = projects.find((p) => p.id === activeProject)

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Timer</h1>

      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        {/* Active timer display */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-6xl font-mono font-bold text-indigo-600 mb-4 tabular-nums">
            {isRunning ? formatDurationA(elapsed) : formatDurationA(0)}
          </div>
          <p className="text-gray-500 text-sm">
            {isRunning
              ? `Tracking: ${activeSession?.task_title || 'Task #' + activeTask}`
              : 'No active timer'}
          </p>
        </div>

        {/* Active task details */}
        {isRunning && activeSession && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {activeSession.task_title || `Task #${activeTask}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activeProjectDetails?.name || `Project #${activeProject}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (activeTask) openDrawer(activeTask) }}
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                >
                  Details
                </button>
                <button
                  onClick={handleStop}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project & Task selectors */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(Number(e.target.value) || '')
                setSelectedTask('')
              }}
              className="w-full border rounded px-3 py-2 text-sm"
              disabled={isRunning}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Task</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(Number(e.target.value) || '')}
              className="w-full border rounded px-3 py-2 text-sm"
              disabled={isRunning}
            >
              <option value="">Select task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Start/Stop button */}
        <div className="flex justify-center gap-4">
          {isThisTaskActive ? (
            <button
              onClick={handleStop}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg text-lg font-medium flex items-center gap-2"
            >
              <span className="w-3 h-3 rounded-full bg-white" />
              Stop Timer
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!selectedTask}
              className={`px-8 py-3 rounded-lg text-lg font-medium flex items-center gap-2 ${
                selectedTask
                  ? isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="text-2xl leading-none">▶</span>
              {isRunning ? 'Switch Timer' : 'Start Timer'}
            </button>
          )}
        </div>
      </div>

      {/* Today's sessions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold mb-3">
          Today's Sessions
          {selectedTask && (
            <span className="text-gray-400 text-sm font-normal ml-2">
              {todayTotal ? <TimeDisplay seconds={todayTotal} /> : '0h 0m'}
            </span>
          )}
        </h2>
        {!selectedTask && (
          <p className="text-sm text-gray-400">Select a task to see today's sessions.</p>
        )}
        <div className="space-y-2">
          {todaySessions.map((s) => {
            const start = new Date(s.start_time)
            const end = s.end_time ? new Date(s.end_time) : null
            const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const endStr = end
              ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'now'
            const isActive = isRunning && activeSession?.id === s.id
            const duration = isActive ? elapsed : (s.duration_seconds ?? 0)
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between py-2 px-3 rounded text-sm ${
                  isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                }`}
              >
                <span className="text-gray-700 font-mono text-xs">{startStr} → {endStr}</span>
                <span className="font-mono text-xs">
                  {isActive ? (
                    <span className="text-indigo-600 flex items-center gap-1">
                      <TimeDisplay seconds={duration} />
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </span>
                  ) : (
                    <TimeDisplay seconds={duration} />
                  )}
                </span>
              </div>
            )
          })}
          {selectedTask && todaySessions.length === 0 && (
            <p className="text-sm text-gray-400">No sessions tracked today for this task.</p>
          )}
        </div>
      </div>
    </div>
  )
}
