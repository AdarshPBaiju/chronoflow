import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { getTasks, moveTask, type Task } from '../api/tasks'
import { useTimerStore } from '../stores/timerStore'
import { useUIStore } from '../stores/uiStore'
import TimeDisplay from './TimeDisplay'
import { formatDurationA } from '../lib/time'

function TaskCard({ task, index }: { task: Task; index: number }) {
  const startTimer = useTimerStore((s) => s.start)
  const stopTimer = useTimerStore((s) => s.stop)
  const openDrawer = useUIStore((s) => s.openTaskDrawer)
  const elapsed = useTimerStore((s) => s.elapsed)
  const isRunning = useTimerStore((s) => s.isRunning)
  const activeSession = useTimerStore((s) => s.activeSession)

  const completedSeconds = (task.sessions || [])
    .filter((s) => s.end_time)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const activeSeconds = task.is_active && isRunning && activeSession?.task === task.id
    ? elapsed
    : 0
  const totalSeconds = completedSeconds + activeSeconds

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2.5 mb-1.5 bg-white border border-gray-200 rounded-md shadow-sm
            hover:border-indigo-300 hover:shadow-md transition-all duration-150
            ${snapshot.isDragging ? 'ring-2 ring-indigo-400 border-indigo-400 shadow-lg rotate-2' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}>
              {task.priority}
            </span>
            <span className="text-[10px] text-gray-400">#{task.id}</span>
          </div>
          <p
            className="font-medium text-sm mb-1.5 cursor-pointer hover:text-indigo-600 line-clamp-2"
            onClick={() => openDrawer(task.id)}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <TimeDisplay seconds={totalSeconds} />
            {activeSeconds > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-500 font-mono tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {formatDurationA(elapsed)}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {task.is_active ? (
              <button
                onClick={(e) => { e.stopPropagation(); stopTimer() }}
                className="text-[11px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); startTimer(task.id) }}
                className="text-[11px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200 transition-colors"
              >
                Start
              </button>
            )}
            <button
              onClick={() => openDrawer(task.id)}
              className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
            >
              Details
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}

const INITIAL_VISIBLE = 6

export default function KanbanBoard({ projectId, refreshTrigger = 0 }: { projectId: number; refreshTrigger?: number }) {
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getColumnsByProject(projectId).then(setColumns)
    getTasks(projectId).then(setTasks)
  }, [projectId, refreshTrigger])

  const tasksByColumn = useCallback(() => {
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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, column: targetCol.id, column_name: targetCol.name } : t
      )
    )

    try {
      await moveTask(taskId, targetCol.id)
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, column: task.column, column_name: task.column_name } : t
        )
      )
    }
  }, [columns, tasks])

  const toggleShowAll = (colName: string) => {
    setShowAll((prev) => ({ ...prev, [colName]: !prev[colName] }))
  }

  const grouped = tasksByColumn()

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-0">
        {columns.map((col) => {
          const colTasks = grouped[col.name] || []
          const isExpanded = showAll[col.name]
          const visibleTasks = isExpanded ? colTasks : colTasks.slice(0, INITIAL_VISIBLE)
          const remaining = colTasks.length - INITIAL_VISIBLE

          return (
            <div key={col.id} className="flex flex-col min-w-[280px] w-[280px] bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-800">{col.name}</h3>
                <span className="bg-gray-200 text-gray-600 text-[11px] font-medium px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <Droppable droppableId={col.name}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 transition-colors duration-150 min-h-[100px]
                      ${snapshot.isDraggingOver ? 'bg-indigo-50' : ''}`}
                  >
                    {visibleTasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                    {!isExpanded && remaining > 0 && (
                      <button
                        onClick={() => toggleShowAll(col.name)}
                        className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 py-2 mt-1 font-medium transition-colors"
                      >
                        See more ({remaining} remaining)
                      </button>
                    )}
                    {isExpanded && colTasks.length > INITIAL_VISIBLE && (
                      <button
                        onClick={() => toggleShowAll(col.name)}
                        className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 py-2 mt-1 font-medium transition-colors"
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
