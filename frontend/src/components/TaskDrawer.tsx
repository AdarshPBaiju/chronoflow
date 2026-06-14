import { useEffect, useState } from 'react'
import type { Task } from '../api/tasks'
import { updateTask, getTasks } from '../api/tasks'
import { getNotes, createNote, type Note } from '../api/notes'
import type { Session } from '../api/sessions'
import { useTimerStore } from '../stores/timerStore'
import TimeDisplay from './TimeDisplay'

interface Props {
  projectId: number
  taskId: number
  onClose: () => void
  onUpdate: () => void
}

function SessionRow({ session }: { session: Session }) {
  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  const start = new Date(session.start_time)
  const end = session.end_time ? new Date(session.end_time) : null
  const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endStr = end
    ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'now'

  const isActive = isRunning && activeSession?.id === session.id
  const duration = isActive
    ? elapsed
    : session.duration_seconds ?? 0

  return (
    <div className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
      <span className="text-gray-500 text-xs w-12 shrink-0">{dateStr}</span>
      <span className="text-gray-700 font-mono text-xs">
        {startStr} → {endStr}
      </span>
      <span className="font-mono text-xs w-16 text-right">
        {isActive ? <span className="text-indigo-600"><TimeDisplay seconds={duration} /></span> : <TimeDisplay seconds={duration} />}
      </span>
      {isActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1 shrink-0" />}
    </div>
  )
}

export default function TaskDrawer({ projectId, taskId, onClose, onUpdate }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  const startTimer = useTimerStore((s) => s.start)
  const stopTimer = useTimerStore((s) => s.stop)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)
  const elapsed = useTimerStore((s) => s.elapsed)

  const isThisTaskActive = isRunning && activeSession?.task === taskId

  useEffect(() => {
    getTasks(projectId).then((ts) => {
      const t = ts.find((t) => t.id === taskId)
      if (t) setTask(t)
    })
    getNotes(taskId).then(setNotes)
  }, [taskId, projectId])

  const handleArchive = async () => {
    if (task) {
      await updateTask(task.id, { is_archived: !task.is_archived })
      onUpdate()
      onClose()
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    const note = await createNote({ task: taskId, content: newNote })
    setNotes((prev) => [note, ...prev])
    setNewNote('')
  }

  const handleTimerToggle = async () => {
    if (isThisTaskActive) {
      await stopTimer()
      onUpdate()
    } else {
      await startTimer(taskId)
      onUpdate()
    }
  }

  if (!task) {
    return (
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl border-l z-50 overflow-y-auto">
        <div className="p-4">Loading...</div>
      </div>
    )
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-500',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }

  const sessions = task.sessions || []
  const completedSessions = sessions.filter((s) => s.end_time)
  const activeSessionForTask = isRunning && activeSession?.task === taskId ? activeSession : null
  const activeElapsed = activeSessionForTask ? elapsed : 0

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayCompleted = completedSessions
    .filter((s) => s.start_time.startsWith(todayStr))
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const todayActive = activeSessionForTask && activeSessionForTask.start_time.startsWith(todayStr) ? elapsed : 0
  const todaySeconds = todayCompleted + todayActive

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekCompleted = completedSessions
    .filter((s) => s.start_time >= weekStartStr)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const weekActive = activeSessionForTask && activeSessionForTask.start_time >= weekStartStr ? elapsed : 0
  const weekSeconds = weekCompleted + weekActive

  const totalCompleted = completedSessions
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const totalSeconds = totalCompleted + activeElapsed

  const createdDate = new Date(task.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const updatedDate = new Date(task.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-xl border-l z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b z-10 px-6 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleArchive}
            className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-2 py-1 rounded"
          >
            {task.is_archived ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
            {task.priority}
          </span>
          {task.is_archived && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">archived</span>
          )}
          {isThisTaskActive && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              active
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold mb-1">{task.title}</h1>
        <p className="text-xs text-gray-400 mb-4">
          Created {createdDate} · Updated {updatedDate}
        </p>

        {task.description && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 whitespace-pre-wrap">
            {task.description}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          {isThisTaskActive ? (
            <button
              onClick={handleTimerToggle}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Stop Timer
            </button>
          ) : (
            <button
              onClick={handleTimerToggle}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
            >
              <span className="text-lg leading-none">▶</span>
              Start Timer
            </button>
          )}
          {task.estimated_seconds && (
            <span className="text-xs text-gray-400">
              Estimated: <TimeDisplay seconds={task.estimated_seconds} />
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Today</p>
            <TimeDisplay seconds={todaySeconds} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Week</p>
            <TimeDisplay seconds={weekSeconds} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <TimeDisplay seconds={totalSeconds} />
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
          Sessions
          <span className="text-xs text-gray-400 font-normal">({sessions.length})</span>
        </h3>
        <div className="space-y-1 mb-6">
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400">No sessions yet. Start the timer to begin tracking.</p>
          )}
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>

        <h3 className="font-semibold text-sm mb-2">Notes</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border rounded px-3 py-1.5 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button onClick={handleAddNote} className="bg-indigo-500 text-white px-3 rounded text-sm hover:bg-indigo-600">
            Add
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {notes.map((n) => (
            <div key={n.id} className="bg-gray-50 rounded p-2.5">
              <p className="text-sm text-gray-700">{n.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>

        {task.movements.length > 0 && (
          <>
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            <div className="space-y-1 mb-6">
              {task.movements.slice(0, 20).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <span>
                    Moved from <strong>{m.from_column_name || 'Start'}</strong> → <strong>{m.to_column_name}</strong>
                  </span>
                  <span className="text-gray-400">
                    {new Date(m.moved_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
