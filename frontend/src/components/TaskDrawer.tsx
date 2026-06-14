import { useEffect, useState } from 'react'
import type { Task } from '../api/tasks'
import { updateTask, getTasks } from '../api/tasks'
import { getNotes, createNote, type Note } from '../api/notes'
import { getSessions, type Session } from '../api/sessions'
import TimeDisplay from './TimeDisplay'

interface Props {
  projectId: number
  taskId: number
  onClose: () => void
  onUpdate: () => void
}

export default function TaskDrawer({ projectId, taskId, onClose, onUpdate }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    getTasks(projectId).then((ts) => {
      const t = ts.find((t) => t.id === taskId)
      if (t) setTask(t)
    })
    getSessions(taskId).then(setSessions)
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

  const todaySeconds = task?.today_time ?? 0
  const weekSeconds = sessions
    .filter((s) => {
      if (!s.end_time) return false
      const d = new Date(s.start_time)
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      return d >= weekStart
    })
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const totalSeconds = task?.total_time ?? 0

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l z-50 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{task?.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500">Today</p>
            <TimeDisplay seconds={todaySeconds} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Week</p>
            <TimeDisplay seconds={weekSeconds} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <TimeDisplay seconds={totalSeconds} />
          </div>
        </div>

        <button
          onClick={handleArchive}
          className="text-sm text-red-500 hover:text-red-600 mb-6"
        >
          {task?.is_archived ? 'Unarchive' : 'Archive'}
        </button>

        <h3 className="font-semibold text-sm mb-2">Sessions</h3>
        <div className="space-y-2 mb-6">
          {sessions.map((s) => (
            <div key={s.id} className="bg-gray-50 rounded p-2 text-sm">
              <span className="text-gray-500">
                {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
              </span>
              {s.duration_seconds && (
                <span className="ml-2 font-mono">
                  <TimeDisplay seconds={s.duration_seconds} />
                </span>
              )}
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-sm mb-2">Notes</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border rounded px-2 py-1 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button onClick={handleAddNote} className="bg-indigo-500 text-white px-3 rounded text-sm">
            Add
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {notes.map((n) => (
            <p key={n.id} className="text-sm bg-gray-50 rounded p-2">{n.content}</p>
          ))}
        </div>

        {task && task.movements.length > 0 && (
          <>
            <h3 className="font-semibold text-sm mb-2">Activity</h3>
            <div className="space-y-1">
              {task.movements.slice(0, 10).map((m) => (
                <p key={m.id} className="text-xs text-gray-500">
                  {m.from_column_name || 'Start'} → {m.to_column_name}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
