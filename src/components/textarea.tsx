import type { ComponentPropsWithRef } from 'react'

/** Native props and refs pass through; InteractionSounds owns the shared audio player. */
export function Textarea(props: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} data-typing-sound />
}
