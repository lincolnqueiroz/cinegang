import type { ViewerIdentity } from '@/lib/viewers'

type ViewerListProps = {
  currentViewerId: string
  error: string | null
  status: 'connected' | 'reconnecting' | 'error'
  viewers: ViewerIdentity[]
}

export default function ViewerList({
  currentViewerId,
  error,
  status,
  viewers,
}: ViewerListProps) {
  return (
    <section
      aria-live="polite"
      className="w-full max-w-6xl rounded-xl border border-white/10 bg-zinc-950 p-4 text-white"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">
          Assistindo agora — {viewers.length}
        </h2>
        <span className="text-xs text-zinc-500">
          {status === 'connected'
            ? 'Atualizado ao vivo'
            : status === 'error'
              ? 'Presença indisponível'
              : 'Reconectando...'}
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : viewers.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          A lista de viewers está sendo atualizada.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {viewers.map((viewer) => (
            <li
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              key={viewer.viewerId}
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{viewer.nickname}</span>
              {viewer.viewerId === currentViewerId && (
                <span className="text-zinc-500">(você)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
