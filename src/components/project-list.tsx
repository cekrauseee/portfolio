import Link from "next/link";
import { projects } from "@/content/portfolio";
import { linkFocusClassName } from "@/components/external-link";

export function ProjectList() {
  return (
    <section
      className="flex flex-col gap-5 [@media(max-height:42rem)]:gap-4 [@media(max-width:23rem)_and_(max-height:42rem)]:gap-3"
      aria-label="Projects"
    >
      {projects.map((project) => (
        <article key={project.slug}>
          <Link
            className={`${linkFocusClassName} group block bg-black/[0.025] px-6 py-5 no-underline transition-colors hover:bg-black/[0.045] focus-visible:bg-black/[0.045] dark:bg-white/[0.035] dark:hover:bg-white/[0.06] dark:focus-visible:bg-white/[0.06] [@media(max-height:42rem)]:px-5 [@media(max-height:42rem)]:py-4 [@media(max-width:23rem)_and_(max-height:42rem)]:px-4 [@media(max-width:23rem)_and_(max-height:42rem)]:py-3.5`}
            href={`/projects/${project.slug}`}
          >
            <h2 className="text-lg leading-7 font-medium">{project.name}</h2>
            <p className="mt-2 leading-6 text-black/55 dark:text-white/65">
              {project.description}
            </p>
            <span className="mt-3 block text-sm text-black/70 dark:text-white/75">
              Read project notes <span aria-hidden="true">→</span>
            </span>
          </Link>
        </article>
      ))}
    </section>
  );
}
