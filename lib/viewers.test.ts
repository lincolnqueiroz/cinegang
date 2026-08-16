import { describe, expect, it } from 'vitest'

import {
  getNicknameKey,
  getViewerChannelName,
  isValidStream,
  normalizeNickname,
  validateNickname,
} from './viewers'

describe('regras de viewers', () => {
  it('normaliza espaços sem remover acentos', () => {
    expect(normalizeNickname('  João   da Silva  ')).toBe('João da Silva')
    expect(getNicknameKey(' ÁLICE ')).toBe('álice')
  })

  it('valida tamanho e caracteres do nickname', () => {
    expect(validateNickname('a')).toContain('2 e 24')
    expect(validateNickname('<script>')).toContain('apenas letras')
    expect(validateNickname('Ana_42')).toBeNull()
  })

  it('isola o canal de presença por stream válida', () => {
    expect(isValidStream('filme-1')).toBe(true)
    expect(isValidStream('../filme')).toBe(false)
    expect(getViewerChannelName('filme-1')).toBe('stream:filme-1:viewers')
  })
})
