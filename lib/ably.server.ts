import 'server-only'

import Ably from 'ably'

let ablyRest: Ably.Rest | null = null

export function getAblyRest() {
  const apiKey = process.env.ABLY_API_KEY

  if (!apiKey) {
    throw new Error('ABLY_API_KEY não está configurada.')
  }

  ablyRest ??= new Ably.Rest({ key: apiKey })

  return ablyRest
}
