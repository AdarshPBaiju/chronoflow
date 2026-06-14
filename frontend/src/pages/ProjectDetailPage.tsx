import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject, deleteProject, type Project } from '../api/projects'
import { getTimeByStage } from '../api/analytics'
import { createColumn, getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { createTask } from '../api/tasks'
import KanbanBoard from '../components/KanbanBoard'
import TaskDrawer from '../components/TaskDrawer'
import TimeDisplay from '../components/TimeDisplay'
import { useUIStore } from '../stores/uiStore'

type Tab = 'overview' | 'board' | 'reports' | 'settings'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stageData, setStageData] = useState<{ name: string; duration_seconds: number; color: string }[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskColumn, setTaskColumn] = useState<number | ''>('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [colName, setColName] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualTask, setManualTask] = useState<number | ''>('')

  const { taskDrawerOpen, selectedTaskId, closeTaskDrawer } = useUIStore()

  useEffect(() => {
    if (!projectId) return
    getProject(projectId).then(setProject)
    getTimeByStage(projectId).then(setStageData)
    getColumnsByProject(projectId).then(setColumns)
  }, [projectId])

  const handleDelete = async () => {
    if (confirm('Delete this project?')) {
      await deleteProject(projectId)
      navigate('/projects')
    }
  }

  const handleArchive = async () => {
    if (project) {
      const updated = await updateProject(projectId, {
        status: project.status === 'active' ? 'archived' : 'active',
      })
      setProject(updated)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask({
      project: projectId,
      column: taskColumn || null,
      title: taskTitle,
      priority: taskPriority,
    })
    setShowNewTask(false)
    setTaskTitle('')
    setTaskColumn('')
    setTaskPriority('medium')
  }

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    const pos = columns.length
    const col = await createColumn({ project: projectId, name: colName, position: pos })
    setColumns((prev) => [...prev, col])
    setShowNewColumn(false)
    setColName('')
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTask || !manualStart || !manualEnd) return
    const client = (await import('../api/client')).default
    await client.post('/sessions/', {
      task: manualTask,
      start_time: new Date(`${manualStart}`).toISOString(),
      end_time: new Date(`${manualEnd}`).toISOString(),
      note: manualNote,
    })
    setShowManualEntry(false)
    setManualStart('')
    setManualEnd('')
    setManualNote('')
    setManualTask('')
  }

  const totalSeconds = project?.total_time ?? 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'board', label: 'Board' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {project && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />}
          <h1 className="text-2xl font-bold">{project?.name}</h1>
        </div>
        <TimeDisplay seconds={totalSeconds} />
      </div>

      <div className="flex gap-4 border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 text-sm font-medium ${activeTab === tab.key ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Time</p>
              <TimeDisplay seconds={totalSeconds} />
            </div>
          </div>

          <h2 className="font-semibold mb-2">Time By Stage</h2>
          <div className="space-y-2 mb-6">
            {stageData.map((s) => (
              <div key={s.name} className="bg-white rounded-lg shadow p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </div>
                <TimeDisplay seconds={s.duration_seconds} />
              </div>
            ))}
          </div>

          <h2 className="font-semibold mb-2">Recent Activity</h2>
        </div>
      )}

      {activeTab === 'board' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowNewTask(true)}
              className="bg-indigo-500 text-white px-4 py-2 rounded text-sm"
            >
              + New Task
            </button>
            <button
              onClick={() => setShowNewColumn(true)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm"
            >
              + New Column
            </button>
            <button
              onClick={() => setShowManualEntry(true)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm"
            >
              + Manual Entry
            </button>
          </div>

          {showNewTask && (
            <form onSubmit={handleCreateTask} className="bg-white rounded-lg shadow p-4 mb-4">
              <input
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
                required
              />
              <select
                value={taskColumn}
                onChange={(e) => setTaskColumn(Number(e.target.value) || '')}
                className="w-full border rounded px-3 py-2 mb-2"
              >
                <option value="">No column</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded text-sm">Create</button>
                <button type="button" onClick={() => setShowNewTask(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </form>
          )}

          {showNewColumn && (
            <form onSubmit={handleCreateColumn} className="bg-white rounded-lg shadow p-4 mb-4">
              <input
                placeholder="Column name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded text-sm">Create</button>
                <button type="button" onClick={() => setShowNewColumn(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </form>
          )}

          {showManualEntry && (
            <form onSubmit={handleManualEntry} className="bg-white rounded-lg shadow p-4 mb-4">
              <select
                value={manualTask}
                onChange={(e) => setManualTask(Number(e.target.value) || '')}
                className="w-full border rounded px-3 py-2 mb-2"
                required
              >
                <option value="">Select task</option>
              </select>
              <input
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
                required
              />
              <input
                type="datetime-local"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
                required
              />
              <input
                placeholder="Note (optional)"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded text-sm">Save</button>
                <button type="button" onClick={() => setShowManualEntry(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            </form>
          )}

          <KanbanBoard projectId={projectId} />
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <p className="text-gray-500">Daily / Weekly / Monthly reports coming soon in the sidebar.</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <button onClick={handleArchive} className="bg-yellow-500 text-white px-4 py-2 rounded text-sm">
            {project?.status === 'active' ? 'Archive Project' : 'Reactivate Project'}
          </button>
          <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded text-sm ml-2">
            Delete Project
          </button>
        </div>
      )}

      {taskDrawerOpen && selectedTaskId && (
        <TaskDrawer
          projectId={projectId}
          taskId={selectedTaskId}
          onClose={closeTaskDrawer}
          onUpdate={() => getProject(projectId).then(setProject)}
        />
      )}
    </div>
  )
}
