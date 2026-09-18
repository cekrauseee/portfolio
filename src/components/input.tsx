import type { ComponentPropsWithRef } from 'react'

/** Native props and refs pass through; InteractionSounds owns the shared audio player. */
export function Input(props: ComponentPropsWithRef<'input'>) {
  return <input {...props} data-typing-sound />
}
