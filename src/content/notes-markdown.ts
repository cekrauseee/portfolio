import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Locale } from '@/i18n/config'

export const NOTES_SPOKEN_NORMALIZATION_VERSION = 'markdown-text-v2-remark-plain-text'

function children(node: { children?: readonly unknown[] }) {
  return (node.children ?? []).map(renderNode).join('')
}

function blockChildren(node: { children?: readonly unknown[] }) {
  return (node.children ?? []).map(renderNode).join('\n\n')
}

function renderNode(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }
  const node = value as {
    type?: string
    value?: string
    alt?: string | null
    children?: readonly unknown[]
  }

  switch (node.type) {
    case 'root':
      return blockChildren(node)
    case 'paragraph':
    case 'heading':
      return children(node)
    case 'blockquote':
    case 'list':
    case 'listItem':
    case 'footnoteDefinition':
      return blockChildren(node)
    case 'text':
    case 'inlineCode':
    case 'code':
      return node.value ?? ''
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
    case 'linkReference':
    case 'footnote':
      return children(node)
    case 'image':
    case 'imageReference':
      return node.alt ?? ''
    case 'break':
      return '\n'
    case 'thematicBreak':
    case 'definition':
      return ''
    case 'html':
      throw new Error(
        'Markdown narration does not support raw HTML; replace it with Markdown text so rendered text and audio stay aligned.',
      )
    default:
      return children(node)
  }
}

export function normalizeNoteForSpeech(markdown: string, locale: Locale) {
  void locale
  const tree = unified().use(remarkParse).parse(markdown) as unknown
  const text = renderNode(tree)
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
  if (!text) {
    throw new Error('Markdown has no narratable plain text.')
  }
  return text
}
