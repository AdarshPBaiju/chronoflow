import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, type Project } from '../api/projects'
import TimeDisplay from '../components/TimeDisplay'

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const navigate = useNavigate()

  useEffect(() => {
    getProjects().then(setProjects)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = await createProject({ name, description, color })
    setProjects((prev) => [...prev, p])
    setShowCreate(false)
    setName('')
    setDescription('')
    setColor('#6366f1')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600"
        >
          + New Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 mb-6">
          <input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded text-sm">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`)}
            className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <h3 className="font-semibold">{p.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-1">{p.task_count} Tasks</p>
            <TimeDisplay seconds={p.total_time} />
            <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
