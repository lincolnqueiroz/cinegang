'use client'

import Ably, {
  type PresenceMessage,
  type TokenDetails,
} from 'ably'
import { useEffect, useState } from 'react'

import NicknameForm from '@/components/NicknameForm'
import ViewerList from '@/components/ViewerList'
import WebRTCPlayer from '@/components/WebRTCPlayer'
import type { ViewerIdentity } from '@/lib/viewers'

type ViewerRoomProps = {
  stream: string
}

type JoinResponse = {
  channelName: string
  identity: ViewerIdentity
  tokenDetails: TokenDetails
}

const SESSION_NICKNAME_KEY = 'cinegang:viewer-nickname'

function isViewerIdentity(value: unknown): value is ViewerIdentity {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ViewerIdentity>

  return (
    typeof candidate.viewerId === 'string' &&
    typeof candidate.nickname === 'string'
  )
}

async function requestJoin(
  stream: string,
  nickname: string,
  viewerId?: string,
) {
  const response = await fetch(
    `/api/streams/${encodeURIComponent(stream)}/viewers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, viewerId }),
    },
  )
  const data = (await response.json()) as JoinResponse | { error?: string }

  if (!response.ok) {
    throw new Error(
      'error' in data && data.error
        ? data.error
        : 'Não foi possível entrar na transmissão.',
    )
  }

  return data as JoinResponse
}

export default function ViewerRoom({ stream }: ViewerRoomProps) {
  const [initialNickname] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : sessionStorage.getItem(SESSION_NICKNAME_KEY) ?? '',
  )
  const [join, setJoin] = useState<JoinResponse | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [viewers, setViewers] = useState<ViewerIdentity[]>([])
  const [presenceStatus, setPresenceStatus] = useState<
    'connected' | 'reconnecting' | 'error'
  >('reconnecting')
  const [presenceError, setPresenceError] = useState<string | null>(null)

  async function handleJoin(nickname: string) {
    setJoining(true)
    setJoinError(null)

    try {
      const nextJoin = await requestJoin(stream, nickname)
      sessionStorage.setItem(SESSION_NICKNAME_KEY, nickname)
      setJoin(nextJoin)
    } catch (error) {
      setJoinError(
        error instanceof Error
          ? error.message
          : 'Não foi possível entrar na transmissão.',
      )
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (!join) {
      return
    }

    let disposed = false
    let firstToken: TokenDetails | null = join.tokenDetails
    const client = new Ably.Realtime({
      clientId: join.identity.viewerId,
      authCallback: (_params, callback) => {
        if (firstToken) {
          const token = firstToken
          firstToken = null
          callback(null, token)
          return
        }

        void requestJoin(
          stream,
          join.identity.nickname,
          join.identity.viewerId,
        ).then(
          ({ tokenDetails }) => callback(null, tokenDetails),
          (error: unknown) =>
            callback(
              error instanceof Error ? error.message : 'Falha ao renovar sessão.',
              null,
            ),
        )
      },
    })
    const channel = client.channels.get(join.channelName)

    function applyMembers(members: PresenceMessage[]) {
      if (disposed) {
        return
      }

      const uniqueViewers = new Map<string, ViewerIdentity>()

      for (const member of members) {
        if (isViewerIdentity(member.data)) {
          uniqueViewers.set(member.data.viewerId, member.data)
        }
      }

      setViewers(
        [...uniqueViewers.values()].sort((left, right) =>
          left.nickname.localeCompare(right.nickname, 'pt-BR', {
            sensitivity: 'base',
          }),
        ),
      )
    }

    async function syncMembers() {
      const members = await channel.presence.get()
      applyMembers(members)
    }

    const handlePresence = () => {
      void syncMembers().catch(() => setPresenceStatus('reconnecting'))
    }
    const handleConnected = () => {
      setPresenceError(null)
      setPresenceStatus('connected')
    }
    const handleDisconnected = () =>
      setPresenceStatus('reconnecting')

    client.connection.on('connected', handleConnected)
    client.connection.on(['disconnected', 'suspended'], handleDisconnected)

    void (async () => {
      try {
        await channel.presence.subscribe(handlePresence)
        await channel.presence.enter(join.identity)
        await syncMembers()
        setPresenceStatus('connected')
      } catch (error) {
        if (!disposed) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : 'Não foi possível sincronizar os viewers.'
          setPresenceError(`Não foi possível sincronizar os viewers: ${message}`)
          setPresenceStatus('error')
        }
      }
    })()

    return () => {
      disposed = true
      channel.presence.unsubscribe(handlePresence)
      client.connection.off('connected', handleConnected)
      client.connection.off('disconnected', handleDisconnected)
      client.connection.off('suspended', handleDisconnected)
      void channel.presence.leave().finally(() => client.close())
    }
  }, [join, stream])

  if (!join) {
    return (
      <NicknameForm
        initialNickname={initialNickname}
        onSubmit={handleJoin}
        pending={joining}
        serverError={joinError}
      />
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <WebRTCPlayer stream={stream} />
      <ViewerList
        currentViewerId={join.identity.viewerId}
        error={presenceError}
        status={presenceStatus}
        viewers={viewers}
      />
    </div>
  )
}
