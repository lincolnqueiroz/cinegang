import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const members = [
  {
    data: {
      viewerId: '123e4567-e89b-42d3-a456-426614174000',
      nickname: 'Ana',
    },
  },
  {
    data: {
      viewerId: '223e4567-e89b-42d3-a456-426614174000',
      nickname: 'Bruno',
    },
  },
]

const presence = {
  enter: vi.fn(async () => undefined),
  get: vi.fn(async () => members),
  leave: vi.fn(async () => undefined),
  subscribe: vi.fn(async () => undefined),
  unsubscribe: vi.fn(),
}

vi.mock('ably', () => ({
  default: {
    Realtime: class {
      channels = { get: () => ({ presence }) }
      connection = { on: vi.fn(), off: vi.fn() }
      close = vi.fn()
    },
  },
}))

vi.mock('@/components/WebRTCPlayer', () => ({
  default: ({ stream }: { stream: string }) => <div>Player {stream}</div>,
}))

import ViewerRoom from './ViewerRoom'

describe('ViewerRoom', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    presence.enter.mockClear()
    presence.get.mockClear()
  })

  it('só exibe o player depois da identificação e lista os viewers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          channelName: 'stream:filme:viewers',
          identity: members[0].data,
          tokenDetails: { token: 'token-validado' },
        }),
        { status: 200 },
      ),
    )

    render(<ViewerRoom stream="filme" />)

    expect(screen.queryByText('Player filme')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nickname'), {
      target: { value: 'Ana' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Assistir à transmissão' }))

    expect(await screen.findByText('Player filme')).toBeInTheDocument()
    expect(await screen.findByText('Assistindo agora — 2')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByText('(você)')).toBeInTheDocument()
    expect(presence.enter).toHaveBeenCalledWith(members[0].data)
  })

  it('mantém o formulário e mostra conflito retornado pela API', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Esse nickname já está sendo usado nesta transmissão.' }),
        { status: 409 },
      ),
    )

    render(<ViewerRoom stream="filme" />)
    fireEvent.change(screen.getByLabelText('Nickname'), {
      target: { value: 'Ana' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Assistir à transmissão' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('já está sendo usado')
    })
    expect(screen.queryByText('Player filme')).not.toBeInTheDocument()
  })
})
