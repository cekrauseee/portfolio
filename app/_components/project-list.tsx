import Link from "next/link";
import { projects } from "../content";
import { linkFocusClassName } from "./external-link";

export function ProjectList() {
  return (
    <section
      className="flex flex-col gap-8 [@media(max-height:42rem)]:gap-6 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-4"
      aria-label="Projects"
    >
      {projects.map((project) => (
        <article key={project.href}>
          <Link
            className={`${linkFocusClassName} group block bg-black/[0.025] p-4 no-underline [@media(max-height:42rem)]:py-3.5 [@media(max-width:23rem)_and_(max-height:42rem)]:py-3 dark:bg-white/[0.035]`}
            href={project.href}
            target="_blank"
            rel="noreferrer"
          >
            <h2 className="text-lg leading-7 font-medium underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] group-hover:decoration-[0.12em]">
              {project.name}
            </h2>
            <p className="mt-1 text-black/55 dark:text-white/65">
              {project.description}
            </p>
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </article>
      ))}
    </section>
  );
}
