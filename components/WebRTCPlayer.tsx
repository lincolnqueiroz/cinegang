'use client'

import { useEffect, useRef, useState } from 'react'

type WebRTCPlayerProps = {
  stream: string
}

type PlayerStatus =
  | 'connecting'
  | 'online'
  | 'offline'
  | 'error'

const RECONNECT_DELAY = 3000

export default function WebRTCPlayer({
  stream,
}: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const [status, setStatus] =
    useState<PlayerStatus>('connecting')

  useEffect(() => {
    let pc: RTCPeerConnection | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let abortController: AbortController | null = null
    let sessionUrl: string | null = null
    let disposed = false

    const mediaMtxUrl =
      process.env.NEXT_PUBLIC_MEDIAMTX_URL

    if (!mediaMtxUrl) {
      setStatus('error')
      return
    }

    const mediaMtxBaseUrl = mediaMtxUrl.replace(/\/$/, '')

    function waitForIceGathering(
      peerConnection: RTCPeerConnection,
    ) {
      if (
        peerConnection.iceGatheringState === 'complete'
      ) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const handleStateChange = () => {
          if (
            peerConnection.iceGatheringState ===
            'complete'
          ) {
            peerConnection.removeEventListener(
              'icegatheringstatechange',
              handleStateChange,
            )

            resolve()
          }
        }

        peerConnection.addEventListener(
          'icegatheringstatechange',
          handleStateChange,
        )
      })
    }

    async function closeConnection() {
      abortController?.abort()
      abortController = null

      if (sessionUrl) {
        const url = sessionUrl
        sessionUrl = null

        try {
          await fetch(url, {
            method: 'DELETE',
          })
        } catch {
          // A sessão pode já ter sido encerrada pelo servidor.
        }
      }

      if (pc) {
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.close()
        pc = null
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimeout) {
        return
      }

      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        void connect()
      }, RECONNECT_DELAY)
    }

    async function connect() {
      if (disposed) {
        return
      }

      await closeConnection()

      setStatus('connecting')

      try {
        abortController = new AbortController()

        const peerConnection =
          new RTCPeerConnection()

        pc = peerConnection

        const mediaStream = new MediaStream()

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        peerConnection.addTransceiver('video', {
          direction: 'recvonly',
        })

        peerConnection.addTransceiver('audio', {
          direction: 'recvonly',
        })

        peerConnection.ontrack = (event) => {
          mediaStream.addTrack(event.track)
        }

        peerConnection.onconnectionstatechange =
          () => {
            if (disposed) {
              return
            }

            switch (
            peerConnection.connectionState
            ) {
              case 'connected':
                setStatus('online')
                break

              case 'failed':
                setStatus('offline')
                scheduleReconnect()
                break

              case 'disconnected':
                setStatus('offline')
                scheduleReconnect()
                break
            }
          }

        const offer =
          await peerConnection.createOffer()

        await peerConnection.setLocalDescription(
          offer,
        )

        // Aguarda os ICE candidates entrarem no SDP.
        await waitForIceGathering(peerConnection)

        if (
          disposed ||
          !peerConnection.localDescription
        ) {
          return
        }

        const url = `${mediaMtxBaseUrl}/${encodeURIComponent(stream)}/whep`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
          },
          body: peerConnection.localDescription.sdp,
          signal: abortController.signal,
        })

        if (!response.ok) {
          if (response.status === 404) {
            setStatus('offline')
          } else {
            setStatus('error')
          }

          scheduleReconnect()
          return
        }

        const location =
          response.headers.get('Location')

        if (location) {
          sessionUrl = new URL(
            location,
            url,
          ).toString()
        }

        const answer = await response.text()

        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: answer,
        })
      } catch (error) {
        if (disposed) {
          return
        }

        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }

        setStatus('offline')
        scheduleReconnect()
      }
    }

    void connect()

    return () => {
      disposed = true

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }

      void closeConnection()
    }
  }, [stream])

  return (
    <div className="relative aspect-video w-full max-w-6xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        className="h-full w-full"
      />

      {status !== 'online' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            {status === 'connecting' && (
              <>
                <p className="text-lg font-medium">
                  Conectando...
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Aguarde a transmissão
                </p>
              </>
            )}

            {status === 'offline' && (
              <>
                <p className="text-lg font-medium">
                  Transmissão offline
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Tentando reconectar...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <p className="text-lg font-medium">
                  Não foi possível carregar a transmissão
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Uma nova tentativa será realizada
                  automaticamente.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {status === 'online' && (
        <div className="pointer-events-none absolute left-4 top-4 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
          AO VIVO
        </div>
      )}
    </div>
  )
}