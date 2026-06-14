import { create } from 'zustand'
import { getActiveSession, startTimer, stopTimer, type Session } from '../api/sessions'

interface TimerState {
  activeSession: Session | null
  isRunning: boolean
  elapsed: number
  intervalId: ReturnType<typeof setInterval> | null
  fetchActive: () => Promise<void>
  start: (taskId: number) => Promise<void>
  stop: () => Promise<void>
  tick: () => void
  cleanup: () => void
}

export const useTimerStore = create<TimerState>((set, get) => {
  const startInterval = () => {
    const { intervalId } = get()
    if (intervalId) clearInterval(intervalId)
    const id = setInterval(() => {
      const s = get()
      if (s.isRunning) set({ elapsed: s.elapsed + 1 })
    }, 1000)
    set({ intervalId: id })
  }

  const computeElapsed = (startTime: string): number => {
    return Math.floor(
      (Date.now() - new Date(startTime).getTime()) / 1000
    )
  }

  return {
    activeSession: null,
    isRunning: false,
    elapsed: 0,
    intervalId: null,
    fetchActive: async () => {
      try {
        const { active, session } = await getActiveSession()
        if (active && session) {
          const elapsed = computeElapsed(session.start_time)
          set({ activeSession: session, isRunning: true, elapsed })
          startInterval()
        }
      } catch {
        // silently fail
      }
    },
    start: async (taskId) => {
      try {
        const session = await startTimer(taskId)
        const elapsed = computeElapsed(session.start_time)
        set({ activeSession: session, isRunning: true, elapsed })
        startInterval()
      } catch {
        const { active, session } = await getActiveSession()
        if (active && session) {
          const elapsed = computeElapsed(session.start_time)
          set({ activeSession: session, isRunning: true, elapsed })
          startInterval()
        }
      }
    },
    stop: async () => {
      const { intervalId } = get()
      if (intervalId) clearInterval(intervalId)
      await stopTimer()
      set({ activeSession: null, isRunning: false, elapsed: 0, intervalId: null })
    },
    tick: () => {
      const s = get()
      if (s.isRunning) set({ elapsed: s.elapsed + 1 })
    },
    cleanup: () => {
      const { intervalId } = get()
      if (intervalId) clearInterval(intervalId)
    },
  }
})
