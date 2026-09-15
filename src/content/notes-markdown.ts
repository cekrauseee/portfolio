import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Locale } from '@/i18n/config'

export const NOTES_SPOKEN_NORMALIZATION_VERSION = 'markdown-text-v3-audio-tags-v1-remark-plain-text'
export const AUDIO_TAGS_VERSION = 'audio-tags-v1'

const AUDIO_TAGS = [
  'calm, conversational',
  'calm, measured',
  'calm, reflective',
  'thoughtful',
  'hopeful',
  'short pause',
  'reflective',
  'explaining',
  'slight emphasis',
  'slightly faster',
  'measured',
  'warmly',
  'slightly weary',
  'subdued',
  'gently',
  'slightly relieved',
  'gently hopeful',
] as const

const escapeRegex = (value: string) => value.replace(/[\\^$*+?.()|[\]{}]/gu, '\\$&')
const AUDIO_TAG_PATTERN = new RegExp(
  '\\[(?:' + AUDIO_TAGS.map((tag) => escapeRegex(tag)).join('|') + ')\\](?:[ \\t])?',
  'gu',
)

type MarkdownNode = {
  type?: string
  value?: string
  alt?: string | null
  children?: readonly MarkdownNode[]
  position?: { start?: { offset?: number } }
}

type SourceRange = { start: number; end: number }

function children(node: MarkdownNode) {
  return (node.children ?? []).map(renderNode).join('')
}

function blockChildren(node: MarkdownNode) {
  return (node.children ?? []).map(renderNode).join('\n\n')
}

function renderNode(value: MarkdownNode): string {
  switch (value.type) {
    case 'root':
      return blockChildren(value)
    case 'paragraph':
    case 'heading':
      return children(value)
    case 'blockquote':
    case 'list':
    case 'listItem':
    case 'footnoteDefinition':
      return blockChildren(value)
    case 'text':
    case 'inlineCode':
    case 'code':
      return value.value ?? ''
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
    case 'linkReference':
    case 'footnote':
      return children(value)
    case 'image':
    case 'imageReference':
      return value.alt ?? ''
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
      return children(value)
  }
}

function normalize(text: string) {
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function parseMarkdown(markdown: string): MarkdownNode {
  return unified().use(remarkParse).parse(markdown) as MarkdownNode
}

function collectAudioTagRanges(node: MarkdownNode, ranges: SourceRange[]): void {
  if (node.type === 'text' && typeof node.value === 'string') {
    const baseOffset = node.position?.start?.offset
    if (baseOffset !== undefined) {
      for (const match of node.value.matchAll(AUDIO_TAG_PATTERN)) {
        const start = baseOffset + (match.index ?? 0)
        ranges.push({ start, end: start + match[0].length })
      }
    }
  }
  for (const child of node.children ?? []) collectAudioTagRanges(child, ranges)
}

export function stripAudioTagsFromMarkdown(markdown: string): string {
  const ranges: SourceRange[] = []
  collectAudioTagRanges(parseMarkdown(markdown), ranges)
  let result = markdown
  for (const range of ranges.sort((left, right) => right.start - left.start)) {
    result = result.slice(0, range.start) + result.slice(range.end)
  }
  return result
}

export function normalizeNoteForSpeech(markdown: string, locale: Locale) {
  void locale
  const tree = parseMarkdown(markdown)
  const text = normalize(renderNode(tree))
  if (!text) {
    throw new Error('Markdown has no narratable plain text.')
  }
  return text
}
