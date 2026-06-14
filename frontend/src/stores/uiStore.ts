import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  taskDrawerOpen: boolean
  selectedTaskId: number | null
  toggleSidebar: () => void
  openTaskDrawer: (taskId: number) => void
  closeTaskDrawer: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  taskDrawerOpen: false,
  selectedTaskId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openTaskDrawer: (taskId) => set({ taskDrawerOpen: true, selectedTaskId: taskId }),
  closeTaskDrawer: () => set({ taskDrawerOpen: false, selectedTaskId: null }),
}))
