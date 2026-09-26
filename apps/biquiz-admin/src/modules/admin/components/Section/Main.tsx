import React, { ReactNode } from 'react'
import { containerMaxW } from '@/config'

type Props = {
  children: ReactNode
  wide?: boolean
}

export default function SectionMain({ children, wide = false }: Props) {
  return <section className={`p-6 ${wide ? 'w-full max-w-none' : containerMaxW}`}>{children}</section>
}
