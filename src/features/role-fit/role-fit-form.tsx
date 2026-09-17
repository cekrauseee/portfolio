'use client'

import { AnimatedButtonLabel } from '@/components/animated-button-label'

import type { SubmitEvent } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { actionSoundProps, focusVisibleClassName, softLinkClassName } from '@/components/links'
import { useHomeActions } from '@/components/home-actions'
import { FieldFeedback, FormErrorFeedback } from '@/components/form-feedback'
import { fitErrorMessage, parseFitErrorCode } from '@/features/role-fit/errors'
import { RoleFitAnswer } from '@/features/role-fit/role-fit-answer'
import { localeTag, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { MAX_ROLE_DESCRIPTION_LENGTH } from '@/features/role-fit/constants'
import { playInteractionSound } from '@/lib/interaction-sounds'
import { stabilizeViewportAnchor } from '@/lib/viewport-scroll'

const WORD_INTERVAL_MS = 24

type Status = 'idle' | 'loading' | 'revealing' | 'done' | 'error'

type RoleFitDictionary = Dictionary['fit']['form']

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  )
}

export function RoleFitForm({
  locale,
  dictionary,
}: {
  locale: Locale
  dictionary: RoleFitDictionary
}) {
  const { openAction } = useHomeActions()
  const [description, setDescription] = useState('')
  const [answer, setAnswer] = useState('')
  const [visibleWordCount, setVisibleWordCount] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [fieldError, setFieldError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const revealTimer = useRef<number | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const assessmentRef = useRef<HTMLElement>(null)

  const characterCount = interpolate(dictionary.characterCount, {
    count: description.length,
    max: MAX_ROLE_DESCRIPTION_LENGTH.toLocaleString(localeTag(locale)),
  })
  const wordEndOffsets = useMemo(
    () =>
      Array.from(answer.matchAll(/\S+(?:\s+|$)/g), (match) => (match.index ?? 0) + match[0].length),
    [answer],
  )
  const visibleAnswer =
    visibleWordCount === 0
      ? ''
      : answer.slice(0, wordEndOffsets[Math.min(visibleWordCount, wordEndOffsets.length) - 1])

  useEffect(() => {
    return () => {
      if (revealTimer.current !== undefined) {
        window.clearTimeout(revealTimer.current)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (!answer || !assessmentRef.current) {
      return
    }

    // Reframe once when the result arrives. The word reveal can then grow in
    // normal document flow without continuously taking control of the viewport.
    stabilizeViewportAnchor(assessmentRef.current, 24)
  }, [answer])

  function clearRevealTimer() {
    if (revealTimer.current !== undefined) {
      window.clearTimeout(revealTimer.current)
      revealTimer.current = undefined
    }
  }

  function revealAnswer(nextAnswer: string) {
    const words = Array.from(nextAnswer.matchAll(/\S+(?:\s+|$)/g))

    setAnswer(nextAnswer)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleWordCount(words.length)
      setStatus('done')
      return
    }

    setVisibleWordCount(0)
    setStatus('revealing')

    let nextWord = 0
    const revealNextWord = () => {
      nextWord += 1
      setVisibleWordCount(nextWord)

      if (nextWord === words.length) {
        revealTimer.current = undefined
        setStatus('done')
        return
      }

      revealTimer.current = window.setTimeout(revealNextWord, WORD_INTERVAL_MS)
    }

    revealNextWord()
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const input = description.trim()
    if (!input) {
      setFieldError(dictionary.emptyDescription)
      setGeneralError('')
      setStatus('error')
      playInteractionSound('error')
      textareaRef.current?.focus()
      return
    }

    clearRevealTimer()
    setAnswer('')
    setVisibleWordCount(0)
    setFieldError('')
    setGeneralError('')
    setStatus('loading')
    playInteractionSound('loading')

    try {
      const response = await fetch('/api/fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input }),
      })
      const data: unknown = await response.json().catch(() => undefined)

      if (!response.ok) {
        const code = parseFitErrorCode(data)
        if (code === 'invalid_description' || code === 'description_rejected') {
          setFieldError(
            code === 'description_rejected'
              ? dictionary.descriptionRejected
              : dictionary.invalidDescription,
          )
          textareaRef.current?.focus()
        } else {
          setGeneralError(fitErrorMessage(code, dictionary))
        }
        setStatus('error')
        playInteractionSound('error')
        return
      }

      if (
        !data ||
        typeof data !== 'object' ||
        !('answer' in data) ||
        typeof data.answer !== 'string' ||
        !data.answer.trim()
      ) {
        setGeneralError(dictionary.unableToAssess)
        setStatus('error')
        playInteractionSound('error')
        return
      }

      playInteractionSound('ready')
      revealAnswer(data.answer)
    } catch {
      setGeneralError(dictionary.connectionError)
      setStatus('error')
      playInteractionSound('error')
    }
  }

  const isBusy = status === 'loading' || status === 'revealing'

  return (
    <div className="text-sm leading-relaxed" lang={localeTag(locale)}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            className={`ease-standard text-[0.8125rem] font-medium transition-colors duration-(--motion-feedback) motion-reduce:transition-none ${fieldError ? 'text-red-700 dark:text-red-400' : ''}`}
            htmlFor="role-description"
          >
            {dictionary.roleDescription}
          </label>
          <textarea
            aria-describedby={`role-description-hint${fieldError ? ' role-description-error' : ''}`}
            aria-invalid={Boolean(fieldError)}
            className={`ease-standard mt-2 min-h-44 w-full min-w-0 resize-y rounded-3xl border bg-black/[0.035] px-4 py-3 [font-family:inherit] text-base leading-6 normal-case transition-[background-color,border-color,outline-color] duration-(--motion-feedback) placeholder:text-black/45 motion-reduce:transition-none dark:bg-white/[0.04] dark:placeholder:text-white/45 ${focusVisibleClassName} ${
              fieldError
                ? 'border-red-700 focus:border-red-700 focus-visible:outline-red-700 dark:border-red-400 dark:focus:border-red-400 dark:focus-visible:outline-red-400'
                : 'border-transparent focus:bg-black/[0.06] dark:focus:bg-white/[0.08]'
            }`}
            disabled={isBusy}
            id="role-description"
            maxLength={MAX_ROLE_DESCRIPTION_LENGTH}
            name="role-description"
            onChange={(event) => {
              setDescription(event.target.value)
              setFieldError('')
              setGeneralError('')
            }}
            placeholder={dictionary.placeholder}
            ref={textareaRef}
            value={description}
          />
          <FieldFeedback
            error={fieldError}
            errorId="role-description-error"
            hint={characterCount}
            hintId="role-description-hint"
          />
        </div>

        <div>
          <FormErrorFeedback message={generalError} />
          <button
            {...actionSoundProps}
            className={`${softLinkClassName} min-h-9 w-fit cursor-pointer !bg-black/[0.07] [font-family:inherit] disabled:cursor-wait disabled:opacity-50 dark:!bg-white/[0.08]`}
            disabled={isBusy}
            type="submit"
          >
            <AnimatedButtonLabel state={isBusy}>
              {isBusy ? dictionary.assessing : dictionary.assess}
            </AnimatedButtonLabel>
          </button>
        </div>
      </form>

      <p className="sr-only" aria-live="polite" role="status">
        {status === 'loading'
          ? dictionary.assessing
          : status === 'done'
            ? dictionary.assessmentReady
            : ''}
      </p>

      {answer ? (
        <section ref={assessmentRef} className="mt-7 text-start" aria-labelledby="fit-assessment">
          <h2 className="text-[0.8125rem] font-medium" id="fit-assessment">
            {dictionary.assessment}
          </h2>
          <div className="mt-3 text-black/75 dark:text-white/85">
            <RoleFitAnswer>{visibleAnswer}</RoleFitAnswer>
          </div>
        </section>
      ) : null}

      {status === 'done' ? (
        <div className="mt-6">
          <button
            {...actionSoundProps}
            className={`${softLinkClassName} min-h-9 w-fit cursor-pointer !bg-black/[0.07] [font-family:inherit] disabled:cursor-wait disabled:opacity-50 dark:!bg-white/[0.08]`}
            onClick={() => openAction('schedule')}
            type="button"
          >
            {dictionary.scheduleConversation}
          </button>
        </div>
      ) : null}
    </div>
  )
}
