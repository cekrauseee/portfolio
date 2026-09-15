'use client'

import { useCallback, useSyncExternalStore } from 'react'

const changeEvent = 'portfolio:collapsible-hash'
type HashSnapshot = { hash: string; source: 'hash' | 'interaction' }
const serverSnapshot: HashSnapshot = { hash: '', source: 'hash' }
let snapshot = serverSnapshot
let interactionHash: string | null = null

export function getCollapsibleHashSnapshot(): HashSnapshot {
  const hash = window.location.hash
  const source = hash === interactionHash ? 'interaction' : 'hash'
  if (snapshot.hash !== hash || snapshot.source !== source) snapshot = { hash, source }
  return snapshot
}

export function readCollapsibleHash(hash: string, prefix: string, ids: readonly string[]) {
  try {
    const value = decodeURIComponent(hash.replace(/^#/, ''))
    return ids.find((id) => value === `${prefix}${id}`) ?? null
  } catch {
    return null
  }
}

export function subscribeToCollapsibleHash(notify: () => void) {
  const navigate = () => {
    interactionHash = null
    notify()
  }
  window.addEventListener('hashchange', navigate)
  window.addEventListener('popstate', navigate)
  window.addEventListener(changeEvent, notify)
  return () => {
    window.removeEventListener('hashchange', navigate)
    window.removeEventListener('popstate', navigate)
    window.removeEventListener(changeEvent, notify)
  }
}

export function writeCollapsibleHash(prefix: string, ids: readonly string[], id: string | null) {
  if (id !== null && !ids.includes(id)) return
  // An outside-click handler from the old panel must not clear the new target.
  if (id === null && readCollapsibleHash(window.location.hash, prefix, ids) === null) return
  const hash = id === null ? '' : `#${prefix}${encodeURIComponent(id)}`
  if (window.location.hash === hash) return
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
  interactionHash = hash
  window.dispatchEvent(new Event(changeEvent))
}

/** The URL owns the portfolio's inline panels. */
export function useCollapsibleHash(prefix: string, ids: readonly string[]) {
  const { hash, source } = useSyncExternalStore(
    subscribeToCollapsibleHash,
    getCollapsibleHashSnapshot,
    () => serverSnapshot,
  )
  const idsKey = JSON.stringify(ids)
  const setOpen = useCallback(
    (id: string | null) => {
      writeCollapsibleHash(prefix, JSON.parse(idsKey) as string[], id)
    },
    [prefix, idsKey],
  )
  return [readCollapsibleHash(hash, prefix, ids), setOpen, source === 'hash'] as const
}
