import { projects } from "../content";
import { linkFocusClassName } from "./external-link";

export function ProjectList() {
  return (
    <section
      className="flex flex-col gap-3 [@media(max-height:42rem)]:gap-2.5 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-2"
      aria-label="Projects"
    >
      {projects.map((project) => (
        <article key={project.href}>
          <a
            className={`${linkFocusClassName} group block bg-black/[0.025] px-6 py-5 no-underline transition-colors hover:bg-black/[0.045] focus-visible:bg-black/[0.045] [@media(max-height:42rem)]:px-5 [@media(max-height:42rem)]:py-4 [@media(max-width:23rem)_and_(max-height:42rem)]:px-4 [@media(max-width:23rem)_and_(max-height:42rem)]:py-3.5 dark:bg-white/[0.035] dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06]`}
            href={project.href}
            target="_blank"
            rel="noreferrer"
          >
            <h2 className="text-lg leading-7 font-medium">
              {project.name}
            </h2>
            <p className="mt-2 leading-6 text-black/55 dark:text-white/65">
              {project.description}
            </p>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </article>
      ))}
    </section>
  );
}
