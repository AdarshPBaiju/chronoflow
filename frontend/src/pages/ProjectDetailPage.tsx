import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject, deleteProject, type Project } from '../api/projects'
import { getTimeByStage } from '../api/analytics'
import { createColumn, getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { createTask, getTasks, type Task } from '../api/tasks'
import { getProjectReport, getDetailedReport, type ProjectReport } from '../api/reports'
import { generatePdfReport } from '../lib/generatePdfReport'
import { useTimerStore } from '../stores/timerStore'
import KanbanBoard from '../components/KanbanBoard'
import TimeDisplay from '../components/TimeDisplay'
import { useUIStore } from '../stores/uiStore'
import { formatDurationA } from '../lib/time'

type Tab = 'overview' | 'tasks' | 'board' | 'reports' | 'settings'
type ActiveForm = 'task' | 'column' | 'manual' | null

export default function ProjectDetailPage() {
  const params = useParams<{ id: string; '*': string }>()
  const navigate = useNavigate()
  const projectId = Number(params.id)
  const tabPath = params['*']?.split('/')[0] || 'overview'
  const validTabs: Tab[] = ['overview', 'tasks', 'board', 'reports', 'settings']
  const activeTab: Tab = validTabs.includes(tabPath as Tab) ? (tabPath as Tab) : 'overview'

  const [project, setProject] = useState<Project | null>(null)
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
  const [projectReport, setProjectReport] = useState<ProjectReport | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)
  const updateVersion = useTimerStore((s) => s.updateVersion)
  const { openTaskDrawer } = useUIStore()

  const isProjectActive = isRunning && activeSession?.project_id === projectId
  const liveTotal = (project?.total_time ?? 0) + (isProjectActive ? elapsed : 0)

  const requestRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    const loadProjectData = async () => {
      const [projectData, stages, projectColumns, tasks, report] = await Promise.all([
        getProject(projectId),
        getTimeByStage(projectId),
        getColumnsByProject(projectId),
        getTasks(projectId),
        getProjectReport(projectId),
      ])
      if (cancelled) return
      setProject(projectData)
      setStageData(stages)
      setColumns(projectColumns)
      setAllTasks(tasks)
      setProjectReport(report)
    }

    void loadProjectData()

    return () => {
      cancelled = true
    }
  }, [projectId, refreshTrigger, updateVersion])

  const setTab = (tab: Tab) => {
    navigate(tab === 'overview' ? `/projects/${projectId}` : `/projects/${projectId}/${tab}`, { replace: false })
  }

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
    if (!taskColumn) return
    await createTask({
      project: projectId,
      column: Number(taskColumn),
      title: taskTitle,
      priority: taskPriority,
    })
    resetForms()
    requestRefresh()
  }

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    const pos = columns.length
    const col = await createColumn({ project: projectId, name: colName, position: pos })
    setColumns((prev) => [...prev, col])
    resetForms()
    requestRefresh()
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
    requestRefresh()
  }

  const totalSeconds = liveTotal
  const decimalHours = (totalSeconds / 3600).toFixed(2)
  const totalMinutes = Math.floor(totalSeconds / 60)

  const activeTasks = allTasks.filter((t) => t.is_active || (t.sessions && t.sessions.some((s) => !s.end_time))).length
  const completedTasks = allTasks.filter((t) => t.column_name && columns.find((c) => c.name === t.column_name && c.is_completed)).length
  const completedPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const detailed = await getDetailedReport({ project_id: projectId })
      await generatePdfReport(detailed)
    } finally {
      setExportingPdf(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'Task List' },
    { key: 'board', label: 'Board' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
      <div className="flex flex-col gap-4">
      {/* Workspace Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Projects</span>
            <span className="material-symbols-outlined text-[14px] text-[#76777d]">chevron_right</span>
            <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#0051d5] font-semibold">{project?.name || 'Loading...'}</span>
          </div>
          <h1 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-[#191c1e] flex items-center gap-3">
            Project Management
            <span className="bg-[#0051d5]/10 text-[#003ea8] px-2 py-0.5 rounded text-[12px] font-bold tracking-wider uppercase">
              {project?.status || 'Active'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3 no-print">
          {/* Tab buttons */}
          <div className="flex bg-white border border-[#c6c6cd] rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`px-3 py-1.5 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded transition-all ${
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-black'
                    : 'text-[#45464d] hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {(activeTab === 'board' || activeTab === 'tasks') && (
            <div className="flex items-center gap-2">
              {activeForm === 'task' ? (
                <button onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] flex items-center gap-2 rounded-lg hover:bg-[#eceef1] transition-all">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Close
                </button>
              ) : (
                <button
                  onClick={() => setActiveForm('task')}
                  className="bg-[#0051d5] text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] flex items-center gap-2 rounded-lg hover:brightness-110 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Task
                </button>
              )}
              {activeTab === 'board' && (
                activeForm === 'column' ? (
                  <button onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] flex items-center gap-2 rounded-lg hover:bg-[#eceef1] transition-all">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Close
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveForm('column')}
                    className="bg-white border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-black flex items-center gap-2 rounded-lg hover:bg-[#eceef1] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    New Column
                  </button>
                )
              )}
            </div>
          )}
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="bg-white border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-black flex items-center gap-2 rounded-lg hover:bg-[#eceef1] disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
            {exportingPdf ? 'Generating...' : 'Export as PDF'}
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        /* Dashboard Bento Grid */
        <div className="grid grid-cols-12 gap-4">
          {/* Time Summary Card */}
          <div className="col-span-12 lg:col-span-4 bg-white border border-[#c6c6cd] p-5 rounded-lg flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-[80px]" style={{ fontVariationSettings: "'FILL' 0" }}>schedule</span>
            </div>
            <div>
              <p className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] uppercase tracking-widest mb-1">Total Time Logged</p>
              <h3 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-black">{formatDurationA(totalSeconds)}</h3>
            </div>
            <div className="mt-4 pt-4 border-t border-[#c6c6cd]/30 flex justify-between items-end">
              <div>
                <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Equivalent Decimal</p>
                <p className="text-[14px] leading-[20px] font-semibold">{decimalHours}h / {totalMinutes}m</p>
              </div>
            </div>
          </div>

          {/* Mini Analytics Cards */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#c6c6cd] p-5 rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#0051d5]/10 flex items-center justify-center text-[#0051d5]">
                <span className="material-symbols-outlined">assignment</span>
              </div>
              <div>
                <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Active Tasks</p>
                <p className="text-[18px] leading-[26px] font-semibold text-black">{String(activeTasks).padStart(2, '0')}</p>
              </div>
            </div>
            <div className="bg-white border border-[#c6c6cd] p-5 rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#d3e4fe] flex items-center justify-center text-[#38485d]">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Task Velocity</p>
                <p className="text-[18px] leading-[26px] font-semibold text-black">{allTasks.length > 0 ? 'Active' : 'Idle'}</p>
              </div>
            </div>
            <div className="bg-white border border-[#c6c6cd] p-5 rounded-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#e0e3e6] flex items-center justify-center text-[#45464d]">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Completed</p>
                <p className="text-[18px] leading-[26px] font-semibold text-black">{completedPct}%</p>
              </div>
            </div>
          </div>

          {/* Stages Section */}
          <div className="col-span-12 bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[#f2f4f7] px-6 py-4 border-b border-[#c6c6cd] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#45464d]">account_tree</span>
                <h2 className="text-[16px] leading-[24px] font-semibold text-black uppercase tracking-wider">Project Stages</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">Sort by: Priority</span>
                <span className="material-symbols-outlined text-[18px] cursor-pointer">filter_list</span>
              </div>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {stageData.map((s) => {
                const count = allTasks.filter((t) => t.column_name === s.name).length
                return (
                  <div key={s.name} className="group hover:bg-[#f7f9fc]/50 transition-all">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: s.color || '#c6c6cd',
                            boxShadow: count > 0 ? `0 0 8px ${s.color}66` : 'none',
                          }}
                        />
                        <div>
                          <h4 className="text-[16px] leading-[24px] font-semibold text-black">{s.name}</h4>
                          <p className="text-[13px] leading-[18px] text-[#45464d]">{count > 0 ? `${count} active item${count > 1 ? 's' : ''}` : 'No items'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d] uppercase">TASK LOAD</p>
                          <p className="text-[14px] leading-[20px] font-bold text-black">{count} {count === 1 ? 'task' : 'tasks'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          {activeForm === 'task' && (
            <form onSubmit={handleCreateTask} className="bg-white border border-[#c6c6cd] rounded-lg p-5 mb-4">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black mb-3">New Task</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                />
                <select
                  value={taskColumn}
                  onChange={(e) => setTaskColumn(Number(e.target.value) || '')}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                >
                  <option value="">Select column</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-[#0051d5] text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">Create</button>
                <button type="button" onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] rounded-lg hover:bg-[#eceef1]">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#c6c6cd] bg-[#f2f4f7] flex items-center justify-between">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Tasks</h3>
              <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">
                {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f7f9fc] text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] border-b border-[#c6c6cd]">
                    <th className="px-5 py-3 font-semibold">Task</th>
                    <th className="px-5 py-3 font-semibold">Stage</th>
                    <th className="px-5 py-3 font-semibold">Priority</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold text-right">Timer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                  {allTasks.map((task) => {
                    const isThisTaskActive = isRunning && activeSession?.task === task.id
                    const completedSeconds = (task.sessions || [])
                      .filter((session) => session.end_time)
                      .reduce((sum, session) => sum + (session.duration_seconds ?? 0), 0)
                    const taskSeconds = completedSeconds + (isThisTaskActive ? elapsed : 0)
                    return (
                      <tr key={task.id} className="hover:bg-[#f7f9fc] transition-colors">
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openTaskDrawer(task.id)}
                            className="text-[14px] leading-[20px] font-semibold text-black hover:text-[#0051d5]"
                          >
                            {task.title}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-[13px] leading-[18px] text-[#45464d]">{task.column_name || 'No column'}</td>
                        <td className="px-5 py-4 text-[13px] leading-[18px] text-[#45464d] capitalize">{task.priority}</td>
                        <td className="px-5 py-4">
                          <TimeDisplay seconds={taskSeconds} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isThisTaskActive ? (
                            <button
                              onClick={() => useTimerStore.getState().stop()}
                              className="bg-red-100 text-red-700 px-3 py-1.5 text-[12px] leading-[16px] font-semibold rounded hover:bg-red-200 transition-colors"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => useTimerStore.getState().start(task.id)}
                              className="bg-[#0051d5]/10 text-[#0051d5] px-3 py-1.5 text-[12px] leading-[16px] font-semibold rounded hover:bg-[#0051d5]/20 transition-colors"
                            >
                              Start
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {allTasks.length === 0 && (
              <div className="p-8 text-center text-[14px] leading-[20px] text-[#45464d]">
                No tasks in this project yet.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <div>
          {/* Forms */}
          {activeForm === 'task' && (
            <form onSubmit={handleCreateTask} className="bg-white border border-[#c6c6cd] rounded-lg p-5 mb-4">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black mb-3">New Task</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                />
                <select
                  value={taskColumn}
                  onChange={(e) => setTaskColumn(Number(e.target.value) || '')}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                >
                  <option value="">Select column</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-[#0051d5] text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">Create</button>
                <button type="button" onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] rounded-lg hover:bg-[#eceef1]">Cancel</button>
              </div>
            </form>
          )}

          {activeForm === 'column' && (
            <form onSubmit={handleCreateColumn} className="bg-white border border-[#c6c6cd] rounded-lg p-5 mb-4">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black mb-3">New Column</h3>
              <input
                placeholder="Column name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 mb-3 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-[#0051d5] text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">Create</button>
                <button type="button" onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] rounded-lg hover:bg-[#eceef1]">Cancel</button>
              </div>
            </form>
          )}

          {activeForm === 'manual' && (
            <form onSubmit={handleManualEntry} className="bg-white border border-[#c6c6cd] rounded-lg p-5 mb-4">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black mb-3">Manual Entry</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={manualTask}
                  onChange={(e) => setManualTask(Number(e.target.value) || '')}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                >
                  <option value="">Select task</option>
                </select>
                <input
                  placeholder="Note (optional)"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                />
                <input
                  type="datetime-local"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                />
                <input
                  type="datetime-local"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="w-full border border-[#c6c6cd] rounded-lg px-3 py-2 text-[14px] leading-[20px] focus:ring-1 focus:ring-[#0051d5] outline-none"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-[#0051d5] text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">Save</button>
                <button type="button" onClick={resetForms} className="border border-[#c6c6cd] px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-[#45464d] rounded-lg hover:bg-[#eceef1]">Cancel</button>
              </div>
            </form>
          )}

          <KanbanBoard projectId={projectId} refreshTrigger={refreshTrigger} onTasksChanged={requestRefresh} />
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="col-span-12 grid grid-cols-12 gap-4">

          <div className="col-span-12 lg:col-span-4 bg-white border border-[#c6c6cd] rounded-lg p-5">
            <p className="text-[11px] leading-[14px] tracking-[0.03em] font-semibold text-[#45464d] uppercase mb-1">
              Project Total
            </p>
            <h3 className="text-[30px] leading-[38px] font-bold tracking-[-0.02em] text-black">
              {formatDurationA(totalSeconds)}
            </h3>
            <p className="text-[13px] leading-[18px] text-[#45464d] mt-2">
              {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'} across {columns.length} {columns.length === 1 ? 'stage' : 'stages'}
            </p>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-white border border-[#c6c6cd] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#c6c6cd] bg-[#f2f4f7]">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Time By Stage</h3>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {(projectReport?.stage_totals ?? []).length === 0 && (
                <div className="p-5 text-[14px] leading-[20px] text-[#45464d]">No stage time logged yet.</div>
              )}
              {(projectReport?.stage_totals ?? []).map((stage) => (
                <div key={stage.name} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#c6c6cd' }} />
                    <span className="text-[14px] leading-[20px] font-semibold text-black">{stage.name}</span>
                  </div>
                  <TimeDisplay seconds={stage.duration_seconds} />
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 bg-white border border-[#c6c6cd] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#c6c6cd] bg-[#f2f4f7] flex items-center justify-between">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Task Totals</h3>
              <span className="text-[11px] leading-[14px] tracking-[0.03em] font-medium text-[#45464d]">
                Project scoped
              </span>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {(projectReport?.task_totals ?? []).length === 0 && (
                <div className="p-5 text-[14px] leading-[20px] text-[#45464d]">No tasks in this project yet.</div>
              )}
              {(projectReport?.task_totals ?? []).map((task) => {
                const taskSeconds = task.duration_seconds
                  + (isRunning && activeSession?.task === task.task_id ? elapsed : 0)
                return (
                  <button
                    key={task.task_id}
                    onClick={() => openTaskDrawer(task.task_id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#f7f9fc] transition-colors"
                  >
                    <div>
                      <p className="text-[14px] leading-[20px] font-semibold text-black">
                        {task.task_code ? <span className="font-mono text-xs text-[#0051d5] mr-1.5">{task.task_code}</span> : null}
                        {task.title}
                      </p>
                      <p className="text-[12px] leading-[16px] text-[#45464d]">{task.column_name || 'No column'}</p>
                    </div>
                    <TimeDisplay seconds={taskSeconds} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="col-span-12 bg-white border border-[#c6c6cd] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#c6c6cd] bg-[#f2f4f7]">
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Daily Totals</h3>
            </div>
            <div className="divide-y divide-[#c6c6cd]">
              {(projectReport?.daily_totals ?? []).length === 0 && (
                <div className="p-5 text-[14px] leading-[20px] text-[#45464d]">No completed sessions yet.</div>
              )}
              {(projectReport?.daily_totals ?? []).map((day) => (
                <div key={day.date} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] leading-[20px] font-semibold text-black">
                      {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[12px] leading-[16px] text-[#45464d]">
                      {day.session_count} {day.session_count === 1 ? 'session' : 'sessions'}
                    </p>
                  </div>
                  <TimeDisplay seconds={day.duration_seconds} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Archive Project</h3>
              <p className="text-[13px] leading-[18px] text-[#45464d]">Move this project to archived status</p>
            </div>
            <button onClick={handleArchive} className="bg-yellow-500 text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">
              {project?.status === 'active' ? 'Archive' : 'Reactivate'}
            </button>
          </div>
          <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] leading-[24px] font-semibold text-black">Delete Project</h3>
              <p className="text-[13px] leading-[18px] text-[#45464d]">Permanently delete this project and all data</p>
            </div>
            <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 text-[12px] leading-[16px] font-semibold tracking-[0.02em] rounded-lg hover:brightness-110">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
