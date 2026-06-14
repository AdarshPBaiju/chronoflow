import { useAuthStore } from '../stores/authStore'
import { formatDurationA, formatDurationB, formatDurationC } from '../lib/time'

interface Props {
  seconds: number
}

export default function TimeDisplay({ seconds }: Props) {
  const mode = useAuthStore((s) => s.profile?.time_display_mode) ?? 'D'

  if (mode === 'A') return <span>{formatDurationA(seconds)}</span>
  if (mode === 'B') return <span>{formatDurationB(seconds)}</span>
  if (mode === 'C') return <span>{formatDurationC(seconds)}</span>
  return (
    <div className="text-sm">
      <div>{formatDurationA(seconds)}</div>
      <div className="text-xs text-gray-500">{formatDurationB(seconds)} &middot; {formatDurationC(seconds)}</div>
    </div>
  )
}
