import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WebRTCPlayer from './WebRTCPlayer'

class MockMediaStream {
  addTrack = vi.fn()
}

class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = []

  connectionState: RTCPeerConnectionState = 'new'
  iceGatheringState: RTCIceGatheringState = 'complete'
  localDescription: RTCSessionDescriptionInit | null = null
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null

  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  addTransceiver = vi.fn()
  close = vi.fn()
  createOffer = vi.fn(async () => ({
    type: 'offer' as RTCSdpType,
    sdp: 'offer-sdp',
  }))
  setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.localDescription = description
  })
  setRemoteDescription = vi.fn(async () => undefined)

  constructor() {
    MockRTCPeerConnection.instances.push(this)
  }
}

describe('WebRTCPlayer', () => {
  beforeEach(() => {
    MockRTCPeerConnection.instances = []
    vi.stubGlobal('MediaStream', MockMediaStream)
    vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('exibe erro sem iniciar uma conexão quando o MediaMTX não está configurado', () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIAMTX_URL', '')

    render(<WebRTCPlayer stream="filme" />)

    expect(
      screen.getByText('Não foi possível carregar a transmissão'),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(MockRTCPeerConnection.instances).toHaveLength(0)
  })

  it('negocia a sessão WHEP e exibe o estado ao vivo', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIAMTX_URL', 'https://media.example.com/')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('answer-sdp', {
        status: 201,
        headers: { Location: '/session/123' },
      }),
    )

    render(<WebRTCPlayer stream="filme especial" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://media.example.com/filme%20especial/whep',
        expect.objectContaining({
          method: 'POST',
          body: 'offer-sdp',
        }),
      )
    })

    const peerConnection = MockRTCPeerConnection.instances[0]
    peerConnection.connectionState = 'connected'
    peerConnection.onconnectionstatechange?.()

    expect(await screen.findByText('AO VIVO')).toBeInTheDocument()
    expect(peerConnection.setRemoteDescription).toHaveBeenCalledWith({
      type: 'answer',
      sdp: 'answer-sdp',
    })
  })

  it('encerra no servidor a sessão WHEP ao desmontar', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIAMTX_URL', 'https://media.example.com')
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response('answer-sdp', {
          status: 201,
          headers: { Location: '/session/123' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const { unmount } = render(<WebRTCPlayer stream="filme" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    unmount()

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        'https://media.example.com/session/123',
        { method: 'DELETE' },
      )
    })
  })
})
