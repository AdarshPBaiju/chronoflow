import { create } from 'zustand'
import { getActiveSession, startTimer, stopTimer, type Session } from '../api/sessions'

interface TimerState {
  activeSession: Session | null
  isRunning: boolean
  elapsed: number
  intervalId: ReturnType<typeof setInterval> | null
  updateVersion: number
  fetchActive: () => Promise<void>
  start: (taskId: number) => Promise<void>
  stop: () => Promise<void>
  tick: () => void
  cleanup: () => void
  triggerUpdate: () => void
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
    updateVersion: 0,
    fetchActive: async () => {
      try {
        const { active, session } = await getActiveSession()
        if (active && session) {
          const elapsed = computeElapsed(session.start_time)
          set({ activeSession: session, isRunning: true, elapsed })
          startInterval()
        } else {
          set({ activeSession: null, isRunning: false, elapsed: 0 })
          const { intervalId } = get()
          if (intervalId) {
            clearInterval(intervalId)
            set({ intervalId: null })
          }
        }
      } catch {
        // silently fail
      }
    },
    start: async (taskId) => {
      const current = get()
      if (current.isRunning && current.activeSession?.task === taskId) return
      if (current.isRunning) {
        if (current.intervalId) clearInterval(current.intervalId)
        await stopTimer()
      }
      await startTimer(taskId)
      await get().fetchActive()
      set((s) => ({ updateVersion: s.updateVersion + 1 }))
    },
    stop: async () => {
      const { intervalId, isRunning, activeSession } = get()
      if (!isRunning && !activeSession) return
      if (intervalId) clearInterval(intervalId)
      await stopTimer()
      await get().fetchActive()
      set((s) => ({ updateVersion: s.updateVersion + 1 }))
    },
    tick: () => {
      const s = get()
      if (s.isRunning) set({ elapsed: s.elapsed + 1 })
    },
    cleanup: () => {
      const { intervalId } = get()
      if (intervalId) clearInterval(intervalId)
    },
    triggerUpdate: () => {
      set((s) => ({ updateVersion: s.updateVersion + 1 }))
    },
  }
})
