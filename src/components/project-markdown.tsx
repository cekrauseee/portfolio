import Image from "next/image";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from "react-markdown";
import { linkSoundProps, textLinkClassName } from "@/components/links";

function isRelativeUrl(value: string) {
  return (
    !value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^[a-z][a-z\d+.-]*:/i.test(value)
  );
}

export function resolveProjectImageSource(
  source: string,
  assetBaseUrl: string,
) {
  if (!isRelativeUrl(source)) {
    return "";
  }

  const resolved = new URL(source, assetBaseUrl);
  return resolved.protocol === "https:" &&
    resolved.hostname === "raw.githubusercontent.com"
    ? resolved.href
    : "";
}

function markdownComponents(): Components {
  return {
    h1: ({ children }) => (
      <h2 className="mt-12 w-fit text-base leading-7 font-semibold lowercase underline decoration-[0.08em] underline-offset-[0.18em] first:mt-0">
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h2 className="mt-12 w-fit text-base leading-7 font-semibold lowercase underline decoration-[0.08em] underline-offset-[0.18em] first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-9 text-base leading-7 font-semibold lowercase">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-7 text-base leading-7 font-semibold lowercase">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mt-4 text-base leading-7 font-normal text-black/58 first:mt-0 dark:text-white/64">
        {children}
      </p>
    ),
    a: ({ children, href }) => (
      <a
        {...linkSoundProps}
        className={`${textLinkClassName} text-black/82 decoration-black/35 dark:text-white/84 dark:decoration-white/35`}
        href={href}
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground font-semibold">{children}</strong>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 font-normal text-black/58 marker:text-black/30 dark:text-white/64 dark:marker:text-white/30">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-7 font-normal text-black/58 marker:text-black/30 dark:text-white/64 dark:marker:text-white/30">
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
      <pre className="mt-5 overflow-x-auto bg-black/[0.035] p-4 text-sm leading-6 font-normal select-text dark:bg-white/[0.06] [&_code]:bg-transparent [&_code]:p-0">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-12 border-black/8 dark:border-white/12" />,
    img: ({ alt = "", src }) => {
      if (typeof src !== "string" || !src) {
        return null;
      }

      return (
        <Image
          className="relative left-1/2 my-7 h-auto w-[min(44rem,calc(100vw-2rem))] max-w-none -translate-x-1/2 outline-1 -outline-offset-1 outline-black/8 dark:outline-white/10"
          src={src}
          alt={alt}
          width={1600}
          height={900}
          sizes="(max-width: 768px) calc(100vw - 2rem), 704px"
        />
      );
    },
  };
}

export function ProjectMarkdown({
  assetBaseUrl,
  content,
}: {
  assetBaseUrl: string;
  content: string;
}) {
  return (
    <div className="mt-12 select-text [&>h2+p]:mt-3">
      <ReactMarkdown
        components={markdownComponents()}
        skipHtml
        urlTransform={(url, key) =>
          key === "src"
            ? resolveProjectImageSource(url, assetBaseUrl)
            : defaultUrlTransform(url)
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
