export const NICKNAME_MIN_LENGTH = 2
export const NICKNAME_MAX_LENGTH = 24

const NICKNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u
const STREAM_PATTERN = /^[\p{L}\p{N}._~-]+$/u

export type ViewerIdentity = {
  viewerId: string
  nickname: string
}

export function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateNickname(value: unknown) {
  if (typeof value !== 'string') {
    return 'Informe um nickname.'
  }

  const nickname = normalizeNickname(value)

  if (
    nickname.length < NICKNAME_MIN_LENGTH ||
    nickname.length > NICKNAME_MAX_LENGTH
  ) {
    return `Use entre ${NICKNAME_MIN_LENGTH} e ${NICKNAME_MAX_LENGTH} caracteres.`
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return 'Use apenas letras, números, espaços, _ ou -.'
  }

  return null
}

export function normalizeStream(value: string) {
  return value.normalize('NFC').trim()
}

export function isValidStream(value: string) {
  const stream = normalizeStream(value)

  return (
    stream.length >= 1 &&
    stream.length <= 100 &&
    STREAM_PATTERN.test(stream)
  )
}

export function getViewerChannelName(stream: string) {
  return `stream:${normalizeStream(stream)}:viewers`
}

export function getNicknameKey(nickname: string) {
  return normalizeNickname(nickname).toLocaleLowerCase('pt-BR')
}
