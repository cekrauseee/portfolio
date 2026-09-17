'use client'

import { AnimatedButtonLabel } from '@/components/animated-button-label'

import type { SubmitEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FieldFeedback, FormErrorFeedback } from '@/components/form-feedback'
import { useHomeActions } from '@/components/home-actions'
import {
  actionSoundProps,
  focusVisibleClassName,
  softLinkClassName,
  toggleSoundProps,
} from '@/components/links'
import {
  appendUniqueMessages,
  prependUniqueMessage,
  resolveGuestbookSubmission,
  type GuestbookSubmissionState,
} from '@/features/guestbook/guestbook-client-state'
import {
  GUESTBOOK_PAGE_SIZE,
  GuestbookErrorPayloadSchema,
  GuestbookPageResponseSchema,
  GuestbookPublishResponseSchema,
  MAX_GUESTBOOK_MESSAGE_LENGTH,
  MAX_GUESTBOOK_NAME_LENGTH,
  type GuestbookErrorCode,
  type GuestbookMessage,
} from '@/features/guestbook/contract'
import { localeTag, type Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { accommodateAction } from '@/lib/action-viewport'
import { playInteractionSound } from '@/lib/interaction-sounds'
import { releaseCollapsedViewport } from '@/lib/viewport-scroll'
import { motion } from '@/lib/motion'

type NameError = 'required' | 'invalid' | null
type MessageError = 'required' | 'invalid' | 'rejected' | null
type GeneralError =
  | Exclude<GuestbookErrorCode, 'invalid_message' | 'message_rejected'>
  | 'unable_to_send'
  | 'connection_error'
  | null
type LiveStatus =
  | 'loading'
  | 'load_error'
  | 'loading_more'
  | 'loaded_more'
  | 'load_more_error'
  | 'sending'
  | 'success'
  | null

function generalErrorMessage(error: GeneralError, dictionary: Dictionary['guestbook']) {
  switch (error) {
    case 'rate_limited':
      return dictionary.rateLimited
    case 'request_denied':
      return dictionary.requestDenied
    case 'service_unavailable':
      return dictionary.serviceUnavailable
    case 'submission_conflict':
      return dictionary.submissionConflict
    case 'connection_error':
      return dictionary.connectionError
    case 'unable_to_send':
      return dictionary.unableToSend
    default:
      return ''
  }
}

function liveStatusMessage(status: LiveStatus, dictionary: Dictionary['guestbook']) {
  switch (status) {
    case 'loading':
      return dictionary.loadingStatus
    case 'load_error':
      return dictionary.loadError
    case 'loading_more':
      return dictionary.loadingMoreStatus
    case 'loaded_more':
      return dictionary.loadedMore
    case 'load_more_error':
      return dictionary.loadMoreError
    case 'sending':
      return dictionary.sendingStatus
    case 'success':
      return dictionary.success
    default:
      return ''
  }
}

export function Guestbook({
  locale,
  dictionary,
}: {
  locale: Locale
  dictionary: Dictionary['guestbook']
}) {
  const { activeAction } = useHomeActions()
  const [composerOpen, setComposerOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(GUESTBOOK_PAGE_SIZE)
  const activeRef = useRef(activeAction)
  const pageSession = useRef(0)
  useEffect(() => {
    activeRef.current = activeAction
    if (activeAction === 'guestbook') {
      return
    }
    pageSession.current += 1
    // Reset presentation after the parent finishes closing, keeping the draft
    // and cached pages intact. A quick reopen cancels this cleanup.
    const timer = window.setTimeout(() => {
      setComposerOpen(false)
      setVisibleCount(GUESTBOOK_PAGE_SIZE)
    }, motion.duration.page)
    return () => window.clearTimeout(timer)
  }, [activeAction])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [nameError, setNameError] = useState<NameError>(null)
  const [messageError, setMessageError] = useState<MessageError>(null)
  const [generalError, setGeneralError] = useState<GeneralError>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [messages, setMessages] = useState<GuestbookMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [loadMoreState, setLoadMoreState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(null)
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set())
  const knownMessageIds = useRef(new Set<string>())
  const nameEdited = useRef(false)
  const initialRequest = useRef(false)
  const loadMoreRequest = useRef(false)
  const submitRequest = useRef(false)
  const submission = useRef<GuestbookSubmissionState | undefined>(undefined)
  const focusMessageAfterSubmit = useRef(false)
  const previousComposerOpen = useRef(composerOpen)
  const rootRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const previous = previousComposerOpen.current
    previousComposerOpen.current = composerOpen
    if (previous === composerOpen || activeAction !== 'guestbook') {
      return
    }

    const root = rootRef.current
    const panel = document.getElementById('guestbook-composer')
    if (!root || !panel) {
      return
    }

    return composerOpen ? accommodateAction(root, panel) : releaseCollapsedViewport(root, panel)
  }, [activeAction, composerOpen])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag(locale), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }),
    [locale],
  )
  const nameErrorMessage =
    nameError === 'required'
      ? dictionary.enterName
      : nameError === 'invalid'
        ? dictionary.validName
        : ''
  const messageErrorMessage =
    messageError === 'required'
      ? dictionary.enterMessage
      : messageError === 'rejected'
        ? dictionary.messageRejected
        : messageError === 'invalid'
          ? dictionary.validMessage
          : ''
  const generalErrorText = generalErrorMessage(generalError, dictionary)
  const liveMessage = liveStatusMessage(liveStatus, dictionary)
  const canRevealMore = Boolean(nextCursor) || messages.length > visibleCount
  const canCollapse =
    messages.length > GUESTBOOK_PAGE_SIZE && !nextCursor && messages.length <= visibleCount
  const paginationButtonState =
    loadMoreState === 'loading' ? 'loading' : canCollapse ? 'collapse' : 'reveal'

  const markEntering = useCallback((ids: string[]) => {
    const newIds = ids.filter((id) => !knownMessageIds.current.has(id))
    for (const id of ids) {
      knownMessageIds.current.add(id)
    }
    if (newIds.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    setEnteringIds((current) => new Set([...current, ...newIds]))
  }, [])

  useEffect(() => {
    if (enteringIds.size === 0) {
      return
    }
    const frame = window.requestAnimationFrame(() => setEnteringIds(new Set()))
    return () => window.cancelAnimationFrame(frame)
  }, [enteringIds])

  useEffect(() => {
    if (!focusMessageAfterSubmit.current || submitting) {
      return
    }
    if (activeAction !== 'guestbook') {
      focusMessageAfterSubmit.current = false
      return
    }

    const frame = window.requestAnimationFrame(() => {
      if (activeAction === 'guestbook' && composerOpen && !messageRef.current?.disabled) {
        messageRef.current?.focus()
      }
      focusMessageAfterSubmit.current = false
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeAction, composerOpen, submitting])

  const loadInitial = useCallback(async () => {
    if (initialRequest.current) {
      return
    }
    initialRequest.current = true
    setLoadState('loading')
    setLiveStatus('loading')

    try {
      const response = await fetch('/api/guestbook', {
        signal: AbortSignal.timeout(30_000),
      })
      const data: unknown = await response.json().catch(() => undefined)
      const parsed = response.ok ? GuestbookPageResponseSchema.safeParse(data) : undefined
      if (!parsed?.success) {
        throw new Error('invalid guestbook response')
      }
      const page = parsed.data

      setMessages((current) => appendUniqueMessages(current, page.messages))
      setNextCursor(page.nextCursor)
      if (!nameEdited.current) {
        setName(page.rememberedName)
      }
      // The first page participates in the parent disclosure's own motion.
      for (const { id } of page.messages) {
        knownMessageIds.current.add(id)
      }
      setLoadState('loaded')
      setLiveStatus(null)
    } catch {
      setLoadState('error')
      setLiveStatus('load_error')
    } finally {
      initialRequest.current = false
    }
  }, [])

  useEffect(() => {
    if (activeAction !== 'guestbook' || loadState !== 'idle') {
      return
    }

    const frame = window.requestAnimationFrame(() => void loadInitial())
    return () => window.cancelAnimationFrame(frame)
  }, [activeAction, loadInitial, loadState])

  async function loadMore() {
    if (messages.length > visibleCount) {
      const revealed = messages.slice(visibleCount, visibleCount + GUESTBOOK_PAGE_SIZE)
      for (const { id } of revealed) {
        knownMessageIds.current.delete(id)
      }
      markEntering(revealed.map(({ id }) => id))
      setVisibleCount((count) => count + GUESTBOOK_PAGE_SIZE)
      setLiveStatus('loaded_more')
      return
    }
    const cursor = nextCursor
    if (!cursor || loadMoreRequest.current || activeAction !== 'guestbook') {
      return
    }
    const session = pageSession.current
    loadMoreRequest.current = true
    setLoadMoreState('loading')
    setLiveStatus('loading_more')

    try {
      const response = await fetch(`/api/guestbook?cursor=${encodeURIComponent(cursor)}`, {
        signal: AbortSignal.timeout(30_000),
      })
      const data: unknown = await response.json().catch(() => undefined)
      const parsed = response.ok ? GuestbookPageResponseSchema.safeParse(data) : undefined
      if (!parsed?.success) {
        throw new Error('invalid guestbook response')
      }
      const page = parsed.data

      setMessages((current) => appendUniqueMessages(current, page.messages))
      setNextCursor(page.nextCursor)
      markEntering(page.messages.map(({ id }) => id))
      if (activeRef.current === 'guestbook' && session === pageSession.current) {
        setVisibleCount((count) => count + GUESTBOOK_PAGE_SIZE)
      }
      setLoadMoreState('idle')
      setLiveStatus('loaded_more')
    } catch {
      setLoadMoreState('error')
      setLiveStatus('load_more_error')
    } finally {
      loadMoreRequest.current = false
    }
  }

  function updateName(value: string) {
    nameEdited.current = true
    setName(value)
    setNameError(null)
    setGeneralError(null)
    setSuccess(false)
  }

  function updateMessage(value: string) {
    setMessage(value)
    setMessageError(null)
    setGeneralError(null)
    setSuccess(false)
  }

  function resolveSubmission(payloadName: string, payloadMessage: string) {
    const next = resolveGuestbookSubmission(payloadName, payloadMessage, submission.current)
    submission.current = next
    return next
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitRequest.current) {
      return
    }

    const trimmedName = name.trim()
    const trimmedMessage = message.trim()
    const nextNameError = !trimmedName
      ? 'required'
      : name.length > MAX_GUESTBOOK_NAME_LENGTH || /[\r\n\u0000]/.test(name)
        ? 'invalid'
        : null
    const nextMessageError = !trimmedMessage
      ? 'required'
      : message.length > MAX_GUESTBOOK_MESSAGE_LENGTH || message.includes('\u0000')
        ? 'invalid'
        : null

    setNameError(nextNameError)
    setMessageError(nextMessageError)
    setGeneralError(null)
    setSuccess(false)
    if (nextNameError || nextMessageError) {
      playInteractionSound('error')
      if (nextNameError) {
        nameRef.current?.focus()
      } else {
        messageRef.current?.focus()
      }
      return
    }

    submitRequest.current = true
    setSubmitting(true)
    const currentSubmission = resolveSubmission(trimmedName, trimmedMessage)
    setLiveStatus('sending')
    playInteractionSound('loading')

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          message: trimmedMessage,
          submissionId: currentSubmission.id,
        }),
      })
      const data: unknown = await response.json().catch(() => undefined)

      if (!response.ok) {
        const parsedError = GuestbookErrorPayloadSchema.safeParse(data)
        const code = parsedError.success ? parsedError.data.error.code : undefined
        if (code === 'invalid_message' || code === 'message_rejected') {
          setMessageError(code === 'message_rejected' ? 'rejected' : 'invalid')
          focusMessageAfterSubmit.current = true
        } else if (code === 'rate_limited') {
          setGeneralError('rate_limited')
        } else if (code === 'request_denied') {
          setGeneralError('request_denied')
        } else if (code === 'service_unavailable') {
          setGeneralError('service_unavailable')
        } else if (code === 'submission_conflict') {
          submission.current = undefined
          setGeneralError('submission_conflict')
        } else {
          setGeneralError('unable_to_send')
        }
        setLiveStatus(null)
        playInteractionSound('error')
        return
      }

      const parsedPublish = GuestbookPublishResponseSchema.safeParse(data)
      if (!parsedPublish.success) {
        setGeneralError('unable_to_send')
        setLiveStatus(null)
        playInteractionSound('error')
        return
      }
      const posted = parsedPublish.data.message

      submission.current = undefined
      setMessages((current) => prependUniqueMessage(current, posted))
      markEntering([posted.id])
      setMessage('')
      setMessageError(null)
      setGeneralError(null)
      setSuccess(true)
      setLiveStatus('success')
      playInteractionSound('success')
    } catch {
      setGeneralError('connection_error')
      setLiveStatus(null)
      playInteractionSound('error')
    } finally {
      submitRequest.current = false
      setSubmitting(false)
    }
  }

  const inputClassName = (hasError: boolean) =>
    `w-full min-w-0 border bg-black/[0.035] px-4 py-2.5 [font-family:inherit] text-base normal-case leading-6 transition-[background-color,border-color,outline-color] duration-(--motion-feedback) ease-standard placeholder:text-black/45 motion-reduce:transition-none dark:bg-white/[0.04] dark:placeholder:text-white/45 ${focusVisibleClassName} ${
      hasError
        ? 'border-red-700 focus:border-red-700 focus-visible:outline-red-700 dark:border-red-400 dark:focus:border-red-400 dark:focus-visible:outline-red-400'
        : 'border-transparent focus:bg-black/[0.06] dark:focus:bg-white/[0.08]'
    }`

  return (
    <div
      className="text-sm leading-relaxed"
      lang={localeTag(locale)}
      data-action-layout-pending={loadState === 'idle' || loadState === 'loading'}
    >
      <p className="mb-4 text-pretty text-black/65 dark:text-white/70">{dictionary.publicNotice}</p>

      <div>
        <div
          aria-hidden={loadState !== 'loading' && loadState !== 'error'}
          inert={loadState !== 'loading' && loadState !== 'error'}
          className={`ease-standard grid transition-[grid-template-rows] duration-(--motion-settle) motion-reduce:transition-none ${loadState === 'loading' || loadState === 'error' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`ease-standard pb-4 transition-[opacity,translate] duration-(--motion-feedback) motion-reduce:transition-none ${loadState === 'loading' || loadState === 'error' ? 'translate-y-0 opacity-100' : '-translate-y-0.5 opacity-0'}`}
            >
              {loadState === 'error' ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-red-700 dark:text-red-400">
                  <span>{dictionary.loadError}</span>
                  <button
                    className={`${softLinkClassName} cursor-pointer !text-red-700 dark:!text-red-400`}
                    onClick={() => void loadInitial()}
                    type="button"
                  >
                    {dictionary.retry}
                  </button>
                </div>
              ) : (
                dictionary.loading
              )}
            </div>
          </div>
        </div>

        <div
          aria-hidden={loadState !== 'loaded' || messages.length !== 0}
          className={`ease-standard grid transition-[grid-template-rows,opacity] duration-(--motion-settle) motion-reduce:transition-none ${loadState === 'loaded' && messages.length === 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="pb-4 text-black/60 dark:text-white/65">{dictionary.empty}</p>
          </div>
        </div>

        <ol
          aria-label={dictionary.publicNotice}
          className={`ease-standard transition-[filter,opacity] duration-(--motion-settle) motion-reduce:transition-none ${composerOpen ? 'opacity-35 blur-[1.5px]' : 'blur-0 opacity-100'}`}
        >
          {messages.map((entry, index) => {
            const collapsed = index >= visibleCount
            const entering = enteringIds.has(entry.id)
            const createdAt = new Date(entry.createdAt)
            const formattedDate = Number.isNaN(createdAt.getTime())
              ? entry.createdAt
              : dateFormatter.format(createdAt)
            return (
              <li
                aria-hidden={collapsed}
                inert={collapsed}
                className={`ease-standard grid transition-[grid-template-rows] duration-(--motion-settle) motion-reduce:transition-none ${entering || collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
                key={entry.id}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`ease-standard pb-4 transition-[opacity,translate] duration-(--motion-feedback) motion-reduce:transition-none ${entering || collapsed ? '-translate-y-0.5 opacity-0' : 'translate-y-0 opacity-100'}`}
                  >
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <strong className="min-w-0 font-medium break-words text-black dark:text-white">
                        <bdi className="normal-case" dir="auto">
                          {entry.name}
                        </bdi>
                      </strong>
                      <time
                        className="text-[0.75rem] text-black/50 dark:text-white/55"
                        dateTime={entry.createdAt}
                      >
                        {formattedDate}
                      </time>
                    </p>
                    <p className="mt-1 break-words whitespace-pre-wrap text-black/75 dark:text-white/85">
                      <bdi className="normal-case" dir="auto">
                        {entry.message}
                      </bdi>
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <div
          aria-hidden={composerOpen || (!canRevealMore && !canCollapse)}
          inert={composerOpen || (!canRevealMore && !canCollapse)}
          className={`ease-standard grid transition-[grid-template-rows,opacity] duration-(--motion-settle) motion-reduce:transition-none ${!composerOpen && (canRevealMore || canCollapse) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="min-h-0 overflow-x-visible overflow-y-clip">
            <div className="pt-1">
              <button
                {...actionSoundProps}
                className={`${softLinkClassName} -ms-4 min-h-9 w-fit cursor-pointer [font-family:inherit] disabled:cursor-wait disabled:opacity-50`}
                disabled={loadMoreState === 'loading'}
                onClick={() => {
                  if (canCollapse) {
                    setVisibleCount(GUESTBOOK_PAGE_SIZE)
                    setLiveStatus(null)
                    return
                  }
                  void loadMore()
                }}
                type="button"
              >
                <AnimatedButtonLabel state={paginationButtonState}>
                  {loadMoreState === 'loading'
                    ? dictionary.loadingMore
                    : canCollapse
                      ? dictionary.seeLess
                      : dictionary.seeMore}
                </AnimatedButtonLabel>
              </button>
              <div
                aria-hidden={loadMoreState !== 'error'}
                className={`ease-standard grid transition-[grid-template-rows] duration-(--motion-settle) motion-reduce:transition-none ${loadMoreState === 'error' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p
                    className={`ease-standard pt-2 text-red-700 transition-[opacity,translate] duration-(--motion-feedback) motion-reduce:transition-none dark:text-red-400 ${loadMoreState === 'error' ? 'translate-y-0 opacity-100' : '-translate-y-0.5 opacity-0'}`}
                  >
                    {dictionary.loadMoreError}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4" ref={rootRef}>
        <button
          {...toggleSoundProps}
          aria-controls="guestbook-composer"
          aria-expanded={composerOpen}
          className={`${softLinkClassName} -ms-4 cursor-pointer ${composerOpen ? 'text-black dark:text-white' : '!bg-black/[0.07] dark:!bg-white/[0.08]'}`}
          id="guestbook-composer-trigger"
          onClick={() => {
            if (!composerOpen) {
              // A pending page may populate the cache, but must not expand
              // the list after the visitor has switched to writing.
              pageSession.current += 1
              setVisibleCount(GUESTBOOK_PAGE_SIZE)
            }
            setComposerOpen((open) => !open)
          }}
          type="button"
        >
          <AnimatedButtonLabel state={composerOpen}>
            {composerOpen ? dictionary.backToMessages : dictionary.writeMessage}
          </AnimatedButtonLabel>
        </button>
        <section
          aria-hidden={!composerOpen}
          aria-labelledby="guestbook-composer-trigger"
          className={`ease-standard grid transition-[grid-template-rows,opacity] duration-[var(--motion-page),var(--motion-settle)] motion-reduce:transition-none ${composerOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}
          id="guestbook-composer"
          inert={composerOpen ? undefined : true}
        >
          <div className="min-h-0 overflow-x-visible overflow-y-clip">
            <div
              className={`ease-standard origin-top-left transition-transform duration-(--motion-page) motion-reduce:transform-none motion-reduce:transition-none ${composerOpen ? 'translate-y-0' : 'translate-y-(--motion-rise)'}`}
            >
              <form className="flex flex-col gap-5 pt-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label
                    className={`ease-standard text-[0.8125rem] font-medium transition-colors duration-(--motion-feedback) motion-reduce:transition-none ${nameErrorMessage ? 'text-red-700 dark:text-red-400' : ''}`}
                    htmlFor="guestbook-name"
                  >
                    {dictionary.name}
                  </label>
                  <input
                    aria-describedby={nameErrorMessage ? 'guestbook-name-error' : undefined}
                    aria-invalid={Boolean(nameErrorMessage)}
                    autoComplete="name"
                    className={`${inputClassName(Boolean(nameErrorMessage))} mt-2 rounded-full`}
                    dir="auto"
                    disabled={submitting}
                    id="guestbook-name"
                    maxLength={MAX_GUESTBOOK_NAME_LENGTH}
                    name="name"
                    required
                    onChange={(event) => updateName(event.target.value)}
                    placeholder={dictionary.namePlaceholder}
                    ref={nameRef}
                    value={name}
                  />
                  <FieldFeedback error={nameErrorMessage} errorId="guestbook-name-error" />
                </div>

                <div>
                  <label
                    className={`ease-standard text-[0.8125rem] font-medium transition-colors duration-(--motion-feedback) motion-reduce:transition-none ${messageErrorMessage ? 'text-red-700 dark:text-red-400' : ''}`}
                    htmlFor="guestbook-message"
                  >
                    {dictionary.message}
                  </label>
                  <textarea
                    aria-describedby={messageErrorMessage ? 'guestbook-message-error' : undefined}
                    aria-invalid={Boolean(messageErrorMessage)}
                    className={`${inputClassName(Boolean(messageErrorMessage))} mt-2 max-h-64 min-h-28 resize-y rounded-3xl`}
                    dir="auto"
                    disabled={submitting}
                    id="guestbook-message"
                    maxLength={MAX_GUESTBOOK_MESSAGE_LENGTH}
                    name="message"
                    required
                    onChange={(event) => updateMessage(event.target.value)}
                    placeholder={dictionary.messagePlaceholder}
                    ref={messageRef}
                    value={message}
                  />
                  <FieldFeedback error={messageErrorMessage} errorId="guestbook-message-error" />
                </div>

                <div>
                  <FormErrorFeedback message={generalErrorText} />
                  <button
                    {...actionSoundProps}
                    className={`${softLinkClassName} min-h-9 w-fit cursor-pointer !bg-black/[0.07] [font-family:inherit] disabled:cursor-wait disabled:opacity-50 dark:!bg-white/[0.08]`}
                    disabled={submitting}
                    type="submit"
                  >
                    <AnimatedButtonLabel state={submitting}>
                      {submitting ? dictionary.sending : dictionary.send}
                    </AnimatedButtonLabel>
                  </button>
                </div>
              </form>

              <div
                aria-hidden={!success}
                className={`ease-standard grid transition-[grid-template-rows] duration-(--motion-settle) motion-reduce:transition-none ${success ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p
                    className={`ease-standard pt-5 text-black/75 transition-[opacity,translate] duration-(--motion-feedback) motion-reduce:transition-none dark:text-white/85 ${success ? 'translate-y-0 opacity-100' : '-translate-y-0.5 opacity-0'}`}
                  >
                    {dictionary.success}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {liveMessage}
      </p>
    </div>
  )
}
