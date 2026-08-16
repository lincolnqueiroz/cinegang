import { beforeEach, describe, expect, it, vi } from 'vitest'

const presenceGet = vi.fn()
const requestToken = vi.fn()

vi.mock('@/lib/ably.server', () => ({
  getAblyRest: () => ({
    auth: { requestToken },
    channels: {
      get: () => ({ presence: { get: presenceGet } }),
    },
  }),
}))

import { POST } from './route'

function request(body: unknown) {
  return new Request('http://localhost/api/streams/filme/viewers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(stream = 'filme') {
  return {
    params: Promise.resolve({ stream }),
  } as RouteContext<'/api/streams/[stream]/viewers'>
}

describe('POST /api/streams/[stream]/viewers', () => {
  beforeEach(() => {
    presenceGet.mockReset().mockResolvedValue({ items: [] })
    requestToken.mockReset().mockResolvedValue({ token: 'token-validado' })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '123e4567-e89b-42d3-a456-426614174000',
    )
  })

  it('rejeita nickname inválido', async () => {
    const response = await POST(request({ nickname: '<x>' }), context())

    expect(response.status).toBe(400)
    expect(presenceGet).not.toHaveBeenCalled()
  })

  it('rejeita nickname já presente sem diferenciar maiúsculas', async () => {
    presenceGet.mockResolvedValue({
      items: [
        {
          data: {
            viewerId: 'outro-viewer',
            nickname: 'ANA',
          },
        },
      ],
    })

    const response = await POST(request({ nickname: 'ana' }), context())

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Esse nickname já está sendo usado nesta transmissão.',
    })
  })

  it('emite token limitado ao canal e preserva a identidade na renovação', async () => {
    const viewerId = '123e4567-e89b-42d3-a456-426614174000'
    const response = await POST(request({ nickname: 'Ana', viewerId }), context())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.identity).toEqual({ viewerId, nickname: 'Ana' })
    expect(requestToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: viewerId,
        capability: JSON.stringify({
          'stream:filme:viewers': ['presence', 'subscribe'],
        }),
      }),
    )
  })

  it('rejeita a entrada quando o Ably não valida a credencial', async () => {
    requestToken.mockRejectedValue(
      Object.assign(new Error('EACCES'), { statusCode: 401 }),
    )

    const response = await POST(request({ nickname: 'Ana' }), context())

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error:
        'O serviço de viewers recusou a conexão. Verifique a chave e o acesso aos canais stream:* no Ably.',
    })
  })
})
