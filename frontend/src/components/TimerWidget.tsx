import { useEffect } from 'react'
import { useTimerStore } from '../stores/timerStore'
import { formatDurationA } from '../lib/time'

export default function TimerWidget() {
  const { activeSession, isRunning, elapsed, fetchActive, stop } = useTimerStore()

  useEffect(() => {
    fetchActive()
    return () => useTimerStore.getState().cleanup()
  }, [fetchActive])

  if (!isRunning || !activeSession) return null

  return (
    <div className="sticky bottom-0 bg-white border-t shadow-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">Currently Working</span>
        <span className="text-sm font-semibold">{activeSession.project_name}</span>
        <span className="text-sm text-gray-600">{activeSession.task_title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xl font-mono font-bold text-indigo-600">
          {formatDurationA(elapsed)}
        </span>
        <button
          onClick={stop}
          className="bg-red-500 text-white px-4 py-1 rounded text-sm hover:bg-red-600"
        >
          Stop
        </button>
      </div>
    </div>
  )
}
