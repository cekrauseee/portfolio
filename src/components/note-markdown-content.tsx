import 'server-only'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import { linkSoundProps, quietLinkClassName } from '@/components/links'
import { rehypeNoteTextPositions } from '@/features/notes/reading'
import type { Locale } from '@/i18n/config'
import { stripAudioTagsFromMarkdown } from '@/content/notes-markdown'

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-8 text-base leading-relaxed font-medium text-black/85 first:mt-0 dark:text-white/85">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-base leading-relaxed font-medium text-black/85 first:mt-0 dark:text-white/85">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-7 text-[0.9375rem] leading-relaxed font-medium text-black/85 dark:text-white/85">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-[0.9375rem] leading-[1.75] text-black/70 first:mt-0 dark:text-white/72">
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a {...linkSoundProps} className={`${quietLinkClassName} font-medium`} href={href}>
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-black dark:text-white">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 ps-5 text-[0.9375rem] leading-relaxed marker:text-black/30 dark:marker:text-white/30">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 ps-5 text-[0.9375rem] leading-relaxed marker:text-black/30 dark:marker:text-white/30">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-s border-black/12 ps-4 text-black/55 dark:border-white/18 dark:text-white/58">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-black/[0.045] px-1 py-0.5 font-mono text-[0.875em] break-words dark:bg-white/[0.08]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-6 overflow-x-auto bg-black/[0.035] p-4 text-sm leading-relaxed dark:bg-white/[0.06] [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-black/8 dark:border-white/12" />,
}

export function NoteMarkdownContent({
  content,
  spokenText,
  locale,
}: {
  content: string
  spokenText: string
  locale: Locale
}) {
  return (
    <ReactMarkdown
      components={components}
      rehypePlugins={[[rehypeNoteTextPositions, { spokenText, locale }]]}
      skipHtml
      urlTransform={defaultUrlTransform}
    >
      {stripAudioTagsFromMarkdown(content)}
    </ReactMarkdown>
  )
}
