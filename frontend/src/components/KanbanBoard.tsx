import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getColumnsByProject, type WorkflowColumn } from '../api/workflows'
import { getTasks, moveTask, type Task } from '../api/tasks'
import { useTimerStore } from '../stores/timerStore'
import { useUIStore } from '../stores/uiStore'
import TimeDisplay from './TimeDisplay'

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const startTimer = useTimerStore((s) => s.start)
  const openDrawer = useUIStore((s) => s.openTaskDrawer)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="font-medium text-sm mb-1">{task.title}</p>
      <TimeDisplay seconds={task.total_time} />
      <div className="flex gap-1 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); startTimer(task.id) }}
          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200"
        >
          Start Timer
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); openDrawer(task.id) }}
          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function Column({ column, tasks }: { column: WorkflowColumn; tasks: Task[] }) {
  return (
    <div className="bg-gray-100 rounded-lg p-3 min-w-[250px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <span className="text-xs text-gray-400 ml-auto">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskCard key={task.id} task={task} />
        ))}
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({ projectId }: { projectId: number }) {
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    getColumnsByProject(projectId).then(setColumns)
    getTasks(projectId).then(setTasks)
  }, [projectId])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }, [tasks])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as number
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const overTask = tasks.find((t) => t.id === over.id)
    const overCol = columns.find((c) => c.id === over.id)

    let newColumnId: number | null = null
    if (overTask) {
      newColumnId = overTask.column
    } else if (overCol) {
      newColumnId = overCol.id
    }

    if (newColumnId && newColumnId !== task.column) {
      await moveTask(taskId, newColumnId)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, column: newColumnId } : t
        )
      )
    }
  }, [tasks, columns])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.column === col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="bg-white rounded shadow-lg p-3 w-[250px] opacity-90">
            <p className="font-medium text-sm">{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
