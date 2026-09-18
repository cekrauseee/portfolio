'use client'

import type { ComponentProps } from 'react'
import { Streamdown } from 'streamdown'
import { motion } from '@/lib/motion'

// Keep the portfolio's editorial markup; Streamdown owns only incremental parsing and fades.
const components = {
  p: ({ children }: ComponentProps<'p'>) => <p>{children}</p>,
  strong: ({ children }: ComponentProps<'strong'>) => <strong>{children}</strong>,
}
const animation = {
  animation: 'fadeIn',
  duration: motion.duration.control,
  easing: motion.easing,
  sep: 'word' as const,
}

export function RoleFitAnswer({
  children,
  isStreaming = false,
}: {
  children: string
  isStreaming?: boolean
}) {
  return (
    <Streamdown
      className="space-y-4 text-start motion-reduce:[&_[data-sd-animate]]:animate-none"
      mode="streaming"
      animated={animation}
      isAnimating={isStreaming}
      components={components}
      allowedElements={['p', 'strong', 'span']}
      skipHtml
      unwrapDisallowed
      controls={false}
      remarkPlugins={[]}
    >
      {children}
    </Streamdown>
  )
}
