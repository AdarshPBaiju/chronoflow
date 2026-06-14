export function formatDurationA(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatDurationB(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatDurationC(seconds: number): string {
  return `${(seconds / 3600).toFixed(2)}h`
}

export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'yesterday'
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatDuration(seconds: number, mode: string = 'D'): string {
  switch (mode) {
    case 'A': return formatDurationA(seconds)
    case 'B': return formatDurationB(seconds)
    case 'C': return formatDurationC(seconds)
    case 'D':
    default:
      return `${formatDurationA(seconds)}\n${formatDurationB(seconds)}\n${formatDurationC(seconds)}`
  }
}
