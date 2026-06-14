import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { getTasks, moveTask, type Task } from '../api/tasks'
import { useTimerStore } from '../stores/timerStore'
import { useUIStore } from '../stores/uiStore'
import { formatDurationA } from '../lib/time'

function TaskCard({ task, index }: { task: Task; index: number }) {
  const startTimer = useTimerStore((s) => s.start)
  const stopTimer = useTimerStore((s) => s.stop)
  const openDrawer = useUIStore((s) => s.openTaskDrawer)
  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  const isThisTaskActive = isRunning && activeSession?.task === task.id

  const completedSeconds = (task.sessions || [])
    .filter((s) => s.end_time)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const activeSeconds = isThisTaskActive ? elapsed : 0
  const totalSeconds = completedSeconds + activeSeconds

  const priorityColors: Record<string, string> = {
    low: 'text-gray-600',
    medium: 'text-[#0051d5]',
    high: 'text-orange-600',
    critical: 'text-red-600',
  }

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-2 bg-white border border-[#c6c6cd] rounded-lg hover:shadow-md transition-all
            ${snapshot.isDragging ? 'ring-2 ring-[#0051d5] shadow-lg rotate-1' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] leading-[14px] font-semibold tracking-[0.02em] ${priorityColors[task.priority] || priorityColors.medium}`}>
                {task.priority}
              </span>
              {isThisTaskActive && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#76777d]">#{task.id}</span>
          </div>
          <p
            className="font-medium text-sm mb-2 cursor-pointer hover:text-[#0051d5] line-clamp-2"
            onClick={() => openDrawer(task.id)}
          >
            {task.title}
          </p>
          <div className="text-[12px] font-mono text-[#45464d] mb-2">
            {totalSeconds > 0 ? formatDurationA(totalSeconds) : 'No time'}
          </div>
          <div className="flex gap-1">
            {isThisTaskActive ? (
              <button
                onClick={(e) => { e.stopPropagation(); stopTimer() }}
                className="text-[11px] leading-[14px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); startTimer(task.id) }}
                className="text-[11px] leading-[14px] font-semibold bg-[#0051d5]/10 text-[#0051d5] px-2 py-0.5 rounded hover:bg-[#0051d5]/20 transition-colors"
              >
                Start
              </button>
            )}
            <button
              onClick={() => openDrawer(task.id)}
              className="text-[11px] leading-[14px] font-semibold bg-[#eceef1] text-[#45464d] px-2 py-0.5 rounded hover:bg-[#e6e8eb] transition-colors"
            >
              Detail
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}

const INITIAL_VISIBLE = 6

interface KanbanBoardProps {
  projectId: number
  refreshTrigger?: number
  onTasksChanged?: () => void
}

export default function KanbanBoard({ projectId, refreshTrigger = 0, onTasksChanged }: KanbanBoardProps) {
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})
  const updateVersion = useTimerStore((s) => s.updateVersion)

  useEffect(() => {
    getColumnsByProject(projectId).then(setColumns)
    getTasks(projectId).then(setTasks)
  }, [projectId, refreshTrigger, updateVersion])

  const grouped = useCallback(() => {
    const map: Record<string, Task[]> = {}
    for (const col of columns) {
      map[col.name] = tasks.filter((t) => t.column_name === col.name)
    }
    return map
  }, [columns, tasks])

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const targetCol = columns.find((c) => c.name === destination.droppableId)
    if (!targetCol) return

    const taskId = Number(draggableId)
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.column_name === destination.droppableId) return

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, column: targetCol.id, column_name: targetCol.name } : t
      )
    )

    try {
      await moveTask(taskId, targetCol.id)
      onTasksChanged?.()
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, column: task.column, column_name: task.column_name } : t
        )
      )
    }
  }, [columns, tasks, onTasksChanged])

  const toggleShowAll = (colName: string) => {
    setShowAll((prev) => ({ ...prev, [colName]: !prev[colName] }))
  }

  const colMap = grouped()
  const maxTasks = Math.max(...Object.values(colMap).map((t) => t.length), 1)

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-0">
        {columns.map((col) => {
          const colTasks = colMap[col.name] || []
          const isExpanded = showAll[col.name]
          const visibleTasks = isExpanded ? colTasks : colTasks.slice(0, INITIAL_VISIBLE)
          const remaining = colTasks.length - INITIAL_VISIBLE

          return (
            <div key={col.id} className="flex flex-col min-w-[280px] w-[280px] bg-white border border-[#c6c6cd] rounded-lg shrink-0">
              <div className="bg-[#f2f4f7] px-4 py-3 border-b border-[#c6c6cd] rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] leading-[20px] font-semibold text-black">{col.name}</h3>
                    <span className="text-[11px] leading-[14px] font-semibold tracking-[0.02em] text-[#45464d] bg-[#e6e8eb] px-1.5 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-[#e0e3e6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0051d5] rounded-full transition-all duration-300"
                    style={{ width: `${(colTasks.length / maxTasks) * 100}%` }}
                  />
                </div>
              </div>
              <Droppable droppableId={col.name}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 min-h-[80px] transition-colors
                      ${snapshot.isDraggingOver ? 'bg-[#0051d5]/5' : ''}`}
                  >
                    {visibleTasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                    {!isExpanded && remaining > 0 && (
                      <button
                        onClick={() => toggleShowAll(col.name)}
                        className="w-full text-center text-[12px] leading-[16px] font-semibold text-[#0051d5] hover:underline py-2 mt-1 transition-colors"
                      >
                        See more ({remaining} remaining)
                      </button>
                    )}
                    {isExpanded && colTasks.length > INITIAL_VISIBLE && (
                      <button
                        onClick={() => toggleShowAll(col.name)}
                        className="w-full text-center text-[12px] leading-[16px] font-semibold text-[#0051d5] hover:underline py-2 mt-1 transition-colors"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
