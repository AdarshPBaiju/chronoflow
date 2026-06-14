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

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  isRunning: false,
  elapsed: 0,
  intervalId: null,
  fetchActive: async () => {
    const { active, session } = await getActiveSession()
    if (active && session) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.start_time).getTime()) / 1000
      )
      set({ activeSession: session, isRunning: true, elapsed })
      const id = setInterval(() => {
        const s = get()
        if (s.isRunning) set({ elapsed: s.elapsed + 1 })
      }, 1000)
      set({ intervalId: id })
    }
  },
  start: async (taskId) => {
    const session = await startTimer(taskId)
    set({ activeSession: session, isRunning: true, elapsed: 0 })
    const id = setInterval(() => {
      const s = get()
      if (s.isRunning) set({ elapsed: s.elapsed + 1 })
    }, 1000)
    set({ intervalId: id })
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
}))
