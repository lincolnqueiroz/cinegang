'use client'

import { useState, type FormEvent } from 'react'

import {
  NICKNAME_MAX_LENGTH,
  normalizeNickname,
  validateNickname,
} from '@/lib/viewers'

type NicknameFormProps = {
  initialNickname: string
  pending: boolean
  serverError: string | null
  onSubmit: (nickname: string) => void
}

export default function NicknameForm({
  initialNickname,
  pending,
  serverError,
  onSubmit,
}: NicknameFormProps) {
  const [nickname, setNickname] = useState(initialNickname)
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const error = validateNickname(nickname)
    setValidationError(error)

    if (!error) {
      onSubmit(normalizeNickname(nickname))
    }
  }

  const error = validationError ?? serverError

  return (
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
        Cinegang
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white">
        Como devemos chamar você?
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Escolha um nickname para assistir e aparecer na lista desta transmissão.
      </p>

      <form className="mt-6" onSubmit={handleSubmit} noValidate>
        <label className="text-sm font-medium text-zinc-200" htmlFor="nickname">
          Nickname
        </label>
        <input
          autoComplete="nickname"
          autoFocus
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          disabled={pending}
          id="nickname"
          maxLength={NICKNAME_MAX_LENGTH}
          onChange={(event) => {
            setNickname(event.target.value)
            setValidationError(null)
          }}
          placeholder="Seu nickname"
          value={nickname}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          className="mt-5 w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Entrando...' : 'Assistir à transmissão'}
        </button>
      </form>
    </section>
  )
}
