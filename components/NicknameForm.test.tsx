import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import NicknameForm from './NicknameForm'

describe('NicknameForm', () => {
  it('valida o nickname antes de enviar', () => {
    const onSubmit = vi.fn()
    render(
      <NicknameForm
        initialNickname=""
        onSubmit={onSubmit}
        pending={false}
        serverError={null}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nickname'), {
      target: { value: '<Ana>' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Assistir à transmissão' }))

    expect(screen.getByRole('alert')).toHaveTextContent('apenas letras')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('normaliza o nickname válido', () => {
    const onSubmit = vi.fn()
    render(
      <NicknameForm
        initialNickname="  Ana   Maria "
        onSubmit={onSubmit}
        pending={false}
        serverError={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Assistir à transmissão' }))

    expect(onSubmit).toHaveBeenCalledWith('Ana Maria')
  })
})
