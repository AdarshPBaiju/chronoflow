import { useEffect, useState } from 'react'
import type { Task } from '../api/tasks'
import { updateTask, getTasks } from '../api/tasks'
import { getNotes, createNote, type Note } from '../api/notes'
import { getSessions, type Session } from '../api/sessions'
import { useTimerStore } from '../stores/timerStore'
import { formatDurationA, timeAgo } from '../lib/time'

interface Props {
  projectId: number
  taskId: number
  onClose: () => void
  onUpdate: () => void
}

const priorityLabel: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
  critical: 'Critical Priority',
}

const priorityColor: Record<string, string> = {
  low: 'bg-gray-50 text-gray-600',
  medium: 'bg-[#0051d5]/10 text-[#0051d5]',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

function SessionRow({ session }: { session: Session }) {
  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  const start = new Date(session.start_time)
  const end = session.end_time ? new Date(session.end_time) : null
  const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const endStr = end
    ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'now'

  const isActive = isRunning && activeSession?.id === session.id
  const duration = isActive ? elapsed : (session.duration_seconds ?? 0)

  return (
    <div className={`flex items-center justify-between px-4 py-3 transition-colors ${isActive ? 'bg-[#0051d5]/5' : 'bg-[#f2f4f7]/50 hover:bg-[#e6e8eb]'}`}>
      <div className="flex items-center gap-4">
        <span className="text-[#45464d] font-medium w-16 shrink-0">{dateStr}</span>
        <span className="text-black text-[13px]">{startStr} → {endStr}</span>
      </div>
      <div className="text-right">
        <span className={`block font-mono text-sm font-bold ${isActive ? 'text-[#0051d5]' : 'text-black'}`}>{formatDurationA(duration)}</span>
        <span className="block text-[#45464d] text-[10px]">{(duration / 3600).toFixed(2)}h</span>
      </div>
      {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
    </div>
  )
}

export default function TaskDrawer({ projectId, taskId, onClose, onUpdate }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)
  const elapsed = useTimerStore((s) => s.elapsed)
  const startTimerStore = useTimerStore((s) => s.start)
  const stopTimerStore = useTimerStore((s) => s.stop)
  const updateVersion = useTimerStore((s) => s.updateVersion)

  const isThisTaskActive = isRunning && activeSession?.task === taskId

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      const [ts, ss, ns] = await Promise.all([
        getTasks(projectId),
        getSessions(taskId),
        getNotes(taskId),
      ])
      if (cancelled) return
      const nextTask = ts.find((t) => t.id === taskId)
      if (nextTask) setTask(nextTask)
      setSessions(ss)
      setNotes(ns)
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [projectId, taskId, updateVersion])

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
      await stopTimerStore()
    } else {
      await startTimerStore(taskId)
    }
  }

  if (!task) {
    return (
      <aside className="fixed top-0 right-0 w-[600px] h-full bg-white z-[60] shadow-2xl border-l border-[#c6c6cd] flex flex-col" style={{ backgroundColor: 'white' }}>
        <div className="p-6 text-[13px] text-[#45464d]">Loading...</div>
      </aside>
    )
  }

  const completedSessions = sessions.filter((s) => s.end_time)
  const activeElapsed = isThisTaskActive ? elapsed : 0
  const totalSeconds = completedSessions.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) + activeElapsed

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todaySeconds = completedSessions
    .filter((s) => s.start_time.startsWith(todayStr))
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
    + (isThisTaskActive && activeSession?.start_time.startsWith(todayStr) ? elapsed : 0)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekSeconds = completedSessions
    .filter((s) => s.start_time >= weekStartStr)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
    + (isThisTaskActive && activeSession && activeSession.start_time >= weekStartStr ? elapsed : 0)

  const createdDate = new Date(task.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const updatedAgo = timeAgo(task.updated_at)

  return (
    <aside className="fixed top-0 right-0 w-[600px] h-full bg-white z-[60] shadow-2xl border-l border-[#c6c6cd] flex flex-col" id="task-drawer" style={{ backgroundColor: 'white' }}>
      {/* Drawer Header */}
      <div className="p-6 border-b border-[#c6c6cd]">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onClose} className="flex items-center gap-1 text-[#45464d] hover:text-[#0051d5] transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-medium text-xs">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleArchive}
              className="px-4 py-1.5 text-xs font-medium border border-[#c6c6cd] rounded hover:bg-[#e6e8eb] transition-colors"
            >
              {task.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={onClose} className="material-symbols-outlined text-[#45464d] hover:text-[#0051d5] cursor-pointer p-1">close</button>
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${priorityColor[task.priority] || priorityColor.medium}`}>
                {priorityLabel[task.priority] || 'Medium Priority'}
              </span>
              <span className="text-[#45464d] font-mono text-[12px] tracking-tight">ID: TSK-{task.id}</span>
              {isThisTaskActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  active
                </span>
              )}
            </div>
            <h2 className="font-bold text-[24px] leading-[32px] text-black">{task.title}</h2>
            <p className="text-[#45464d] text-[13px] mt-1">
              Created {createdDate} • Updated {updatedAgo}
            </p>
          </div>
        </div>
        {task.description && (
          <div className="mt-4 p-3 bg-[#f2f4f7] border border-[#c6c6cd] rounded text-[13px] text-[#45464d] whitespace-pre-wrap">
            {task.description}
          </div>
        )}
      </div>

      {/* Drawer Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Timer Section */}
        <section className="bg-[#f2f4f7] p-6 rounded-xl border border-[#c6c6cd]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0051d5] text-white rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
              </div>
              <div>
                <span className="block text-[#45464d] text-[11px] leading-[14px] font-semibold tracking-[0.02em] uppercase tracking-widest">Active Session</span>
                <span className="block font-mono text-[24px] leading-[32px] font-bold text-black">{formatDurationA(isThisTaskActive ? elapsed : 0)}</span>
              </div>
            </div>
            <button
              onClick={handleTimerToggle}
              className={`flex items-center gap-2 text-white px-8 py-3 rounded-full font-medium transition-all active:scale-95 shadow-lg ${isThisTaskActive
                ? 'bg-[#ba1a1a] hover:opacity-90 shadow-[#ba1a1a]/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isThisTaskActive ? 'stop' : 'play_arrow'}
              </span>
              {isThisTaskActive ? 'Stop Timer' : 'Start Timer'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Today', seconds: todaySeconds },
              { label: 'Week', seconds: weekSeconds },
              { label: 'Total', seconds: totalSeconds },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-white border border-[#c6c6cd] rounded text-center">
                <span className="block text-[#45464d] text-[10px] font-bold uppercase mb-1">{item.label}</span>
                <span className="block font-mono text-[16px] leading-[24px]">{formatDurationA(item.seconds)}</span>
                <span className="block text-[#45464d] text-[10px]">{Math.floor(item.seconds / 60)}m · {(item.seconds / 3600).toFixed(2)}h</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sessions History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[16px] leading-[24px] flex items-center gap-2">
              Sessions
              <span className="text-[#45464d] opacity-50 font-normal">({sessions.length})</span>
            </h3>
          </div>
          <div className="rounded border border-[#c6c6cd] overflow-hidden">
            {sessions.length === 0 && (
              <div className="p-6 text-center text-[13px] text-[#45464d]">
                No sessions yet. Start the timer to begin tracking.
              </div>
            )}
            {sessions.map((s, i) => (
              <div key={s.id} className={i > 0 ? 'border-t border-[#c6c6cd]' : ''}>
                <SessionRow session={s} />
              </div>
            ))}
          </div>
        </section>

        {/* Notes Section */}
        <section>
          <h3 className="font-semibold text-[16px] leading-[24px] mb-4">Notes</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a quick note..."
              className="flex-1 bg-[#f2f4f7] border border-[#c6c6cd] rounded px-4 py-2 text-sm focus:ring-1 focus:ring-[#0051d5]/50 focus:border-[#0051d5] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <button
              onClick={handleAddNote}
              className="bg-[#0051d5] text-white px-6 py-2 rounded font-medium active:scale-95 transition-transform"
            >
              Add
            </button>
          </div>
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-[13px] text-[#45464d]">No notes added yet.</p>
            )}
            {notes.map((n) => (
              <div key={n.id} className="p-4 border-l-4 border-[#0051d5]/30 bg-[#f2f4f7] rounded-r">
                <p className="text-[13px] text-black">{n.content}</p>
                <span className="text-[10px] text-[#45464d] mt-2 block">{n.user_name || 'Unknown'} · {timeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Feed */}
        {task.movements && task.movements.length > 0 && (
          <section className="pb-8">
            <h3 className="font-semibold text-[16px] leading-[24px] mb-4">Activity</h3>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#c6c6cd]">
              {task.movements.slice(0, 20).map((m) => (
                <div key={m.id} className="relative pl-8">
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-[#e6e8eb] border-4 border-white" />
                  <p className="text-body-sm">
                    <span className="font-bold">System</span> moved task from{' '}
                    <span className="bg-[#e6e8eb] px-1.5 py-0.5 rounded text-[11px] font-mono">{m.from_column_name || 'Start'}</span>
                    {' '}to{' '}
                    <span className="bg-[#0051d5]/10 text-[#0051d5] px-1.5 py-0.5 rounded text-[11px] font-mono">{m.to_column_name}</span>
                  </p>
                  <span className="text-[#45464d] text-[11px]">{timeAgo(m.moved_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-6 border-t border-[#c6c6cd] bg-[#f2f4f7] flex justify-between items-center">
        <div className="flex items-center gap-2 text-[#45464d]">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span className="text-[11px] leading-[14px] font-semibold tracking-[0.02em]">1 person viewing</span>
        </div>
        <button
          onClick={onClose}
          className="bg-[#0051d5] text-white px-8 py-2.5 rounded font-medium shadow-lg shadow-[#0051d5]/10 transition-all active:scale-95"
        >
          Close
        </button>
      </div>
    </aside>
  )
}
