import type { SoundName } from 'cuelume'
import type { ComponentProps } from 'react'

export const focusVisibleClassName =
  'focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground dark:focus-visible:outline-foreground-dark'

export const linkFocusClassName = 'touch-manipulation focus-visible:outline-none'

export const textLinkClassName = `${linkFocusClassName} underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] hover:decoration-[0.12em] focus-visible:decoration-[0.12em]`

export const quietLinkClassName = `${linkFocusClassName} min-h-6 font-medium no-underline text-black/65 transition-colors duration-(--motion-feedback) ease-standard hover:text-black focus-visible:text-black motion-reduce:transition-none dark:text-white/70 dark:hover:text-white dark:focus-visible:text-white`

export const softLinkClassName = `${linkFocusClassName} inline-flex min-h-8 items-center rounded-full bg-transparent px-4 py-1 text-[0.8125rem] leading-5 font-medium text-black/80 no-underline transition-[background-color,color,scale] duration-(--motion-feedback) ease-standard not-disabled:hover:bg-black/[0.10]! not-disabled:hover:text-black focus-visible:bg-black/[0.10]! focus-visible:text-black motion-safe:active:scale-(--motion-press-scale) motion-reduce:transition-none dark:text-white/85 dark:not-disabled:hover:bg-white/[0.14]! dark:not-disabled:hover:text-white dark:focus-visible:bg-white/[0.14]! dark:focus-visible:text-white`

/** Cuelume's toggle attribute follows native click activation, including keyboard. */
export function interactionSoundProps(sound: SoundName, disabled = false) {
  return {
    'data-cuelume-hover': disabled ? undefined : 'tick',
    'data-cuelume-toggle': disabled ? undefined : sound,
  } as const
}

export const linkSoundProps = interactionSoundProps('press')
export const actionSoundProps = interactionSoundProps('pulse')
export const toggleSoundProps = interactionSoundProps('toggle')
export const dismissSoundProps = interactionSoundProps('droplet')

export function disclosureSoundProps(expanded: boolean, disabled = false) {
  return interactionSoundProps(expanded ? 'droplet' : 'bloom', disabled)
}

type ExternalLinkProps = Omit<ComponentProps<'a'>, 'rel' | 'target'> & {
  newTabLabel?: string
  appearance?: 'text' | 'quiet' | 'soft'
}

export function ExternalLink({
  children,
  className,
  newTabLabel = ' (opens in a new tab)',
  appearance = 'text',
  ...props
}: ExternalLinkProps) {
  const linkClassName = {
    text: textLinkClassName,
    quiet: quietLinkClassName,
    soft: softLinkClassName,
  }[appearance]

  return (
    <a
      {...linkSoundProps}
      {...props}
      className={`${linkClassName} ${className ?? ''}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <span className="sr-only">{newTabLabel}</span>
    </a>
  )
}
