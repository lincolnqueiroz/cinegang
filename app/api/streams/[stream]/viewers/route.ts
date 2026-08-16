import { getAblyRest } from '@/lib/ably.server'
import {
  getNicknameKey,
  getViewerChannelName,
  isValidStream,
  normalizeNickname,
  normalizeStream,
  validateNickname,
  type ViewerIdentity,
} from '@/lib/viewers'

export const runtime = 'nodejs'

const TOKEN_TTL_MS = 60 * 60 * 1000
const MAX_BODY_SIZE = 1024

type JoinRequest = {
  nickname?: unknown
  viewerId?: unknown
}

const VIEWER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export async function POST(
  request: Request,
  context: RouteContext<'/api/streams/[stream]/viewers'>,
) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)

  if (contentLength > MAX_BODY_SIZE) {
    return Response.json(
      { error: 'Requisição muito grande.' },
      { status: 413 },
    )
  }

  const { stream: rawStream } = await context.params
  const stream = normalizeStream(rawStream)

  if (!isValidStream(stream)) {
    return Response.json(
      { error: 'Transmissão inválida.' },
      { status: 400 },
    )
  }

  let body: JoinRequest

  try {
    body = (await request.json()) as JoinRequest
  } catch {
    return Response.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 },
    )
  }

  const validationError = validateNickname(body.nickname)

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 })
  }

  const nickname = normalizeNickname(body.nickname as string)
  const requestedViewerId =
    typeof body.viewerId === 'string' &&
    VIEWER_ID_PATTERN.test(body.viewerId)
      ? body.viewerId
      : null
  const channelName = getViewerChannelName(stream)

  try {
    const ably = getAblyRest()
    const presentViewers = await ably.channels
      .get(channelName)
      .presence.get({ limit: 1000 })
    const nicknameKey = getNicknameKey(nickname)
    const nicknameInUse = presentViewers.items.some(
      ({ data }) =>
        isViewerIdentity(data) &&
        getNicknameKey(data.nickname) === nicknameKey &&
        data.viewerId !== requestedViewerId,
    )

    if (nicknameInUse) {
      return Response.json(
        { error: 'Esse nickname já está sendo usado nesta transmissão.' },
        { status: 409 },
      )
    }

    const viewerId = requestedViewerId ?? crypto.randomUUID()
    const tokenDetails = await ably.auth.requestToken({
      clientId: viewerId,
      ttl: TOKEN_TTL_MS,
      capability: JSON.stringify({
        [channelName]: ['presence', 'subscribe'],
      }),
    })

    return Response.json({
      channelName,
      identity: { viewerId, nickname } satisfies ViewerIdentity,
      tokenDetails,
    })
  } catch (error) {
    console.error('Não foi possível criar a sessão do viewer.', error)

    return Response.json(
      {
        error:
          'O serviço de viewers recusou a conexão. Verifique a chave e o acesso aos canais stream:* no Ably.',
      },
      { status: 503 },
    )
  }
}
