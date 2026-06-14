import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject, deleteProject, type Project } from '../api/projects'
import { getTimeByStage } from '../api/analytics'
import { createColumn, getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { createTask, getTasks, type Task } from '../api/tasks'
import { useTimerStore } from '../stores/timerStore'
import KanbanBoard from '../components/KanbanBoard'
import TaskDrawer from '../components/TaskDrawer'
import TimeDisplay from '../components/TimeDisplay'
import { useUIStore } from '../stores/uiStore'

type Tab = 'overview' | 'board' | 'reports' | 'settings'
type ActiveForm = 'task' | 'column' | 'manual' | null

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stageData, setStageData] = useState<{ name: string; duration_seconds: number; color: string }[]>([])
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskColumn, setTaskColumn] = useState<number | ''>('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [colName, setColName] = useState('')
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualTask, setManualTask] = useState<number | ''>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [allTasks, setAllTasks] = useState<Task[]>([])

  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)
  const { taskDrawerOpen, selectedTaskId, closeTaskDrawer } = useUIStore()

  const isProjectActive = isRunning && activeSession?.project_id === projectId
  const liveTotal = (project?.total_time ?? 0) + (isProjectActive ? elapsed : 0)

  useEffect(() => {
    if (!projectId) return
    getProject(projectId).then(setProject)
    getTimeByStage(projectId).then(setStageData)
    getColumnsByProject(projectId).then(setColumns)
    getTasks(projectId).then(setAllTasks)
  }, [projectId, refreshTrigger])

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

  const resetForms = () => {
    setActiveForm(null)
    setTaskTitle('')
    setTaskColumn('')
    setTaskPriority('medium')
    setColName('')
    setManualStart('')
    setManualEnd('')
    setManualNote('')
    setManualTask('')
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask({
      project: projectId,
      column: taskColumn || null,
      title: taskTitle,
      priority: taskPriority,
    })
    resetForms()
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    const pos = columns.length
    const col = await createColumn({ project: projectId, name: colName, position: pos })
    setColumns((prev) => [...prev, col])
    resetForms()
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTask || !manualStart || !manualEnd) return
    const client = (await import('../api/client')).default
    await client.post('/sessions/', {
      task: manualTask,
      start_time: new Date(manualStart).toISOString(),
      end_time: new Date(manualEnd).toISOString(),
      note: manualNote,
    })
    resetForms()
  }

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
        <TimeDisplay seconds={liveTotal} />
      </div>

      <div className="flex gap-4 border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
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
              <TimeDisplay seconds={liveTotal} />
            </div>
          </div>

          <h2 className="font-semibold mb-2">Stages</h2>
          <div className="space-y-2 mb-6">
            {stageData.map((s) => {
              const count = allTasks.filter((t) => t.column_name === s.name).length
              return (
                <div key={s.name} className="bg-white rounded-lg shadow p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">{count} {count === 1 ? 'task' : 'tasks'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <div>
          <div className="flex gap-2 mb-4">
            {activeForm === 'task' ? (
              <button onClick={resetForms} className="text-gray-500 text-sm px-3 py-2">Close</button>
            ) : (
              <button
                onClick={() => setActiveForm('task')}
                className="bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600 transition-colors"
              >
                + New Task
              </button>
            )}
            {activeForm === 'column' ? (
              <button onClick={resetForms} className="text-gray-500 text-sm px-3 py-2">Close</button>
            ) : (
              <button
                onClick={() => setActiveForm('column')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                + New Column
              </button>
            )}
            {activeForm === 'manual' ? (
              <button onClick={resetForms} className="text-gray-500 text-sm px-3 py-2">Close</button>
            ) : (
              <button
                onClick={() => setActiveForm('manual')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                + Manual Entry
              </button>
            )}
          </div>

          {activeForm === 'task' && (
            <form onSubmit={handleCreateTask} className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">New Task</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                <select
                  value={taskColumn}
                  onChange={(e) => setTaskColumn(Number(e.target.value) || '')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No column</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-600">Create</button>
                <button type="button" onClick={resetForms} className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
              </div>
            </form>
          )}

          {activeForm === 'column' && (
            <form onSubmit={handleCreateColumn} className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">New Column</h3>
              <input
                placeholder="Column name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-600">Create</button>
                <button type="button" onClick={resetForms} className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
              </div>
            </form>
          )}

          {activeForm === 'manual' && (
            <form onSubmit={handleManualEntry} className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Manual Entry</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={manualTask}
                  onChange={(e) => setManualTask(Number(e.target.value) || '')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select task</option>
                </select>
                <input
                  placeholder="Note (optional)"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="datetime-local"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  type="datetime-local"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-500 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-600">Save</button>
                <button type="button" onClick={resetForms} className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
              </div>
            </form>
          )}

          <KanbanBoard projectId={projectId} refreshTrigger={refreshTrigger} />
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
