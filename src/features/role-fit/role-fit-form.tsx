'use client'

import { Textarea } from '@/components/textarea'
import { AnimatedButtonLabel } from '@/components/animated-button-label'

import type { SubmitEvent } from 'react'
import { createUISFX } from 'uisfx'
import { createStreamingTypingSound, typingSoundOptions } from '@/lib/typing-sound'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  disclosureSoundProps,
  interactionSoundProps,
  focusVisibleClassName,
  softLinkClassName,
  quietLinkClassName,
} from '@/components/links'
import { useHomeActions } from '@/components/home-actions'
import { FieldFeedback, FormErrorFeedback } from '@/components/form-feedback'
import { fitErrorMessage, parseFitErrorCode } from '@/features/role-fit/errors'
import { RoleFitAnswer } from '@/features/role-fit/role-fit-answer'
import { localeTag, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { MAX_ROLE_DESCRIPTION_LENGTH } from '@/features/role-fit/constants'
import { playInteractionSound } from '@/lib/interaction-sounds'
import { createRoleFitStageMotion } from '@/features/role-fit/stage-motion'
import { createRoleFitRevealLayout } from '@/features/role-fit/reveal-layout'
import { createWordStream } from '@/features/role-fit/word-stream'
import { readFitStream, FitStreamError } from '@/features/role-fit/stream'

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
  introduction,
}: {
  locale: Locale
  dictionary: RoleFitDictionary
  introduction: string
}) {
  const { activeAction, openAction } = useHomeActions()
  const [editing, setEditing] = useState(true)
  const [description, setDescription] = useState('')
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [fieldError, setFieldError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const revealLayout = useRef<ReturnType<typeof createRoleFitRevealLayout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const stageMotion = useRef<ReturnType<typeof createRoleFitStageMotion> | null>(null)
  const focusAfterSwap = useRef<'form' | 'result' | null>(null)
  const isBusy = status === 'loading' || status === 'revealing'
  const typingSound = useRef<ReturnType<typeof createStreamingTypingSound> | null>(null)
  const wordsRef = useRef<ReturnType<typeof createWordStream> | null>(null)

  useEffect(() => {
    const sound = createStreamingTypingSound(
      createUISFX(typingSoundOptions),
      () =>
        !document.hidden &&
        Boolean(rootRef.current?.closest('[data-action-open="true"]')) &&
        resultRef.current?.getAttribute('aria-hidden') === 'false',
    )
    typingSound.current = sound
    const visibilityChanged = () => {
      if (document.hidden) sound.silence()
    }
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => {
      document.removeEventListener('visibilitychange', visibilityChanged)
      sound.dispose()
      typingSound.current = null
    }
  }, [])

  useLayoutEffect(() => {
    if (activeAction !== 'fit' || editing) typingSound.current?.silence()
  }, [activeAction, editing])

  useLayoutEffect(() => {
    if (answer) typingSound.current?.word()
  }, [answer])

  const characterCount = interpolate(dictionary.characterCount, {
    count: description.length,
    max: MAX_ROLE_DESCRIPTION_LENGTH.toLocaleString(localeTag(locale)),
  })
  useLayoutEffect(() => {
    if (!stageRef.current || !formRef.current || !resultRef.current) return
    const controller = createRoleFitStageMotion(
      stageRef.current,
      formRef.current,
      resultRef.current,
      (stage) => {
        if (
          stage === 'result' &&
          resultRef.current?.getAttribute('aria-busy') === 'true' &&
          rootRef.current?.closest('[data-action-open="true"]') &&
          !revealLayout.current
        ) {
          revealLayout.current = createRoleFitRevealLayout(rootRef.current)
        }
        if (focusAfterSwap.current === stage) {
          focusAfterSwap.current = null
          if (rootRef.current?.closest('[data-action-open="true"]')) {
            const outgoing = stage === 'form' ? resultRef.current : formRef.current
            const focused = document.activeElement
            if (focused && focused !== document.body && !outgoing?.contains(focused)) return
            const target = stage === 'form' ? textareaRef.current : resultRef.current
            target?.focus({ preventScroll: true })
          }
        }
      },
    )
    stageMotion.current = controller
    return () => {
      controller.dispose()
      stageMotion.current = null
    }
  }, [])

  useLayoutEffect(() => {
    stageMotion.current?.update(editing ? 'form' : 'result')
  }, [editing])

  function captureReveal() {
    if (!stageMotion.current?.isTransitioning()) revealLayout.current?.capture()
  }

  function editDescription() {
    stageMotion.current?.capture()
    revealLayout.current?.cancel()
    revealLayout.current = null
    focusAfterSwap.current = 'form'
    setEditing(true)
  }

  useLayoutEffect(() => {
    if (activeAction !== 'fit' || editing || stageMotion.current?.isTransitioning()) {
      revealLayout.current?.cancel()
      revealLayout.current = null
      return
    }
    if (
      !revealLayout.current &&
      rootRef.current &&
      (status === 'loading' || status === 'revealing')
    ) {
      revealLayout.current = createRoleFitRevealLayout(rootRef.current)
    }
    revealLayout.current?.animate()
    if (status === 'done' || status === 'error') revealLayout.current?.finish()
  }, [answer, status, activeAction, editing])

  useEffect(
    () => () => {
      requestRef.current?.abort()
      wordsRef.current?.cancel()
      revealLayout.current?.cancel()
    },
    [],
  )

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

    stageMotion.current?.capture()
    focusAfterSwap.current = 'result'
    setEditing(false)
    requestRef.current?.abort()
    wordsRef.current?.cancel()
    revealLayout.current?.cancel()
    revealLayout.current = rootRef.current ? createRoleFitRevealLayout(rootRef.current) : null
    const request = new AbortController()
    requestRef.current = request
    setAnswer('')
    setFieldError('')
    setGeneralError('')
    setStatus('loading')
    typingSound.current?.start()
    playInteractionSound('loading')

    const words = createWordStream(
      (text) => {
        captureReveal()
        setAnswer(text)
        setStatus('revealing')
      },
      () => {
        typingSound.current?.stop()
        captureReveal()
        setStatus('done')
        playInteractionSound('ready')
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    wordsRef.current = words

    try {
      const response = await fetch('/api/fit', {
        method: 'POST',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input }),
      })
      if (!response.ok) {
        words.cancel()
        typingSound.current?.stop()
        const data: unknown = await response.json().catch(() => undefined)
        const code = parseFitErrorCode(data)
        if (code === 'invalid_description' || code === 'description_rejected') {
          setFieldError(
            code === 'description_rejected'
              ? dictionary.descriptionRejected
              : dictionary.invalidDescription,
          )
        } else {
          setGeneralError(fitErrorMessage(code, dictionary))
        }
        editDescription()
        setStatus('error')
        playInteractionSound('error')
        return
      }

      if (!response.body) throw new FitStreamError()
      let receivedText = false
      for await (const delta of readFitStream(response.body)) {
        if (request.signal.aborted) return
        receivedText ||= Boolean(delta.trim())
        words.push(delta)
      }
      if (!receivedText) throw new FitStreamError()
      words.finish()
    } catch (error) {
      words.cancel()
      typingSound.current?.stop()
      if (request.signal.aborted) return
      editDescription()
      setGeneralError(
        error instanceof FitStreamError
          ? fitErrorMessage(error.code, dictionary)
          : dictionary.connectionError,
      )
      setStatus('error')
      playInteractionSound('error')
    }
  }

  return (
    <div ref={rootRef} className="text-sm leading-relaxed" lang={localeTag(locale)}>
      <div ref={stageRef} className="relative">
        <form
          ref={formRef}
          className={`flex flex-col gap-5 ${editing ? 'relative opacity-100' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'}`}
          aria-hidden={!editing}
          inert={!editing}
          onSubmit={handleSubmit}
          noValidate
        >
          <p className="text-pretty">{introduction}</p>
          <div>
            <label
              className={`ease-standard text-[0.8125rem] font-medium transition-colors duration-(--motion-feedback) motion-reduce:transition-none ${fieldError ? 'text-red-700 dark:text-red-400' : ''}`}
              htmlFor="role-description"
            >
              {dictionary.roleDescription}
            </label>
            <Textarea
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
              {...interactionSoundProps('pulse', isBusy)}
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

        <div
          ref={resultRef}
          tabIndex={-1}
          role="group"
          aria-label={dictionary.assessment}
          aria-busy={isBusy}
          aria-hidden={editing}
          inert={editing}
          className={
            editing
              ? 'pointer-events-none absolute inset-x-0 top-0 opacity-0'
              : 'relative opacity-100'
          }
        >
          <p
            aria-hidden="true"
            className={`ease-standard w-fit transition-opacity duration-(--motion-settle) motion-reduce:transition-none ${status === 'loading' ? 'role-fit-shimmer relative opacity-100' : 'pointer-events-none absolute inset-x-0 top-0 opacity-0'}`}
          >
            {dictionary.assessing}
          </p>
          {answer ? (
            <section className="text-start" aria-labelledby="fit-assessment">
              <h2
                className="animate-journal-fade text-[0.8125rem] font-medium motion-reduce:animate-none"
                id="fit-assessment"
              >
                {dictionary.assessment}
              </h2>
              <div className="mt-3 text-black/75 dark:text-white/85">
                <RoleFitAnswer isStreaming={status === 'revealing'}>{answer}</RoleFitAnswer>
              </div>
            </section>
          ) : null}

          {status === 'done' ? (
            <div
              data-fit-schedule
              className="animate-journal-fade mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 motion-reduce:animate-none"
            >
              <button
                {...disclosureSoundProps(false)}
                className={`${softLinkClassName} min-h-9 w-fit cursor-pointer !bg-black/[0.07] [font-family:inherit] disabled:cursor-wait disabled:opacity-50 dark:!bg-white/[0.08]`}
                onClick={() => openAction('schedule')}
                type="button"
              >
                {dictionary.scheduleConversation}
              </button>
              <button
                {...disclosureSoundProps(true)}
                type="button"
                className={`${quietLinkClassName} cursor-pointer text-left`}
                onClick={editDescription}
              >
                {dictionary.editDescription}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite" role="status">
        {status === 'loading'
          ? dictionary.assessing
          : status === 'done'
            ? dictionary.assessmentReady
            : ''}
      </p>
    </div>
  )
}
