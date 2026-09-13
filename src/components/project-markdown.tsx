import Image from 'next/image'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import { linkSoundProps, quietLinkClassName } from '@/components/links'

function isRelativeUrl(value: string) {
  return !value.startsWith('/') && !value.startsWith('//') && !/^[a-z][a-z\d+.-]*:/i.test(value)
}

export function resolveProjectImageSource(source: string, assetBaseUrl: string) {
  if (!isRelativeUrl(source)) {
    return ''
  }

  const resolved = new URL(source, assetBaseUrl)
  return resolved.protocol === 'https:' && resolved.hostname === 'raw.githubusercontent.com'
    ? resolved.href
    : ''
}

function markdownComponents(): Components {
  return {
    h1: ({ children }) => (
      <h4 className="mt-6 text-[0.9375rem] leading-relaxed font-medium text-black/85 lowercase first:mt-0 dark:text-white/85">
        {children}
      </h4>
    ),
    h2: ({ children }) => (
      <h4 className="mt-6 text-[0.9375rem] leading-relaxed font-medium text-black/85 lowercase first:mt-0 dark:text-white/85">
        {children}
      </h4>
    ),
    h3: ({ children }) => (
      <h5 className="mt-5 text-[0.9375rem] leading-relaxed font-medium lowercase">{children}</h5>
    ),
    h4: ({ children }) => (
      <h6 className="mt-5 text-[0.9375rem] leading-relaxed font-medium lowercase">{children}</h6>
    ),
    p: ({ children }) => (
      <p className="mt-3 text-[0.9375rem] leading-relaxed font-normal text-black/65 first:mt-0 dark:text-white/70">
        {children}
      </p>
    ),
    a: ({ children, href }) => (
      <a {...linkSoundProps} className={`${quietLinkClassName} font-medium`} href={href}>
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground dark:text-foreground-dark font-medium">{children}</strong>
    ),
    ul: ({ children }) => (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.9375rem] leading-relaxed font-normal text-black/65 marker:text-black/30 dark:text-white/70 dark:marker:text-white/30">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.9375rem] leading-relaxed font-normal text-black/65 marker:text-black/30 dark:text-white/70 dark:marker:text-white/30">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-5 border-s border-black/12 ps-4 font-normal text-black/48 dark:border-white/18 dark:text-white/52">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-black/[0.045] px-1 py-0.5 font-mono text-[0.875em] break-words dark:bg-white/[0.08]">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="mt-5 overflow-x-auto bg-black/[0.035] p-4 text-sm leading-relaxed font-normal dark:bg-white/[0.06] [&_code]:bg-transparent [&_code]:p-0">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-6 border-black/8 dark:border-white/12" />,
    img: ({ alt = '', src }) => {
      if (typeof src !== 'string' || !src) {
        return null
      }

      return (
        <Image
          className="my-5 h-auto w-full outline-1 -outline-offset-1 outline-black/8 dark:outline-white/10"
          src={src}
          alt={alt}
          width={1600}
          height={900}
          sizes="(max-width: 576px) calc(100vw - 2rem), 544px"
        />
      )
    },
  }
}

export function ProjectMarkdown({
  assetBaseUrl,
  content,
}: {
  assetBaseUrl: string
  content: string
}) {
  return (
    <div className="mt-4 [&>h4+p]:mt-2 [&>h5+p]:mt-2 [&>h6+p]:mt-2">
      <ReactMarkdown
        components={markdownComponents()}
        skipHtml
        urlTransform={(url, key) =>
          key === 'src' ? resolveProjectImageSource(url, assetBaseUrl) : defaultUrlTransform(url)
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
