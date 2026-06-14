import { create } from 'zustand'
import { getProjects, getProject, type Project } from '../api/projects'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  loading: boolean
  fetchProjects: () => Promise<void>
  selectProject: (id: number) => Promise<void>
  clearSelection: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  fetchProjects: async () => {
    set({ loading: true })
    const projects = await getProjects()
    set({ projects, loading: false })
  },
  selectProject: async (id) => {
    const project = await getProject(id)
    set({ selectedProject: project })
  },
  clearSelection: () => set({ selectedProject: null }),
}))
