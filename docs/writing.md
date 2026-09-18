# Writing and localization

This is the editorial reference for the portfolio's interface, profile,
experience, project descriptions, and notes. It records the voice and structure
approved during the September 2026 editorial revision. Individual replacement
strings still need to follow the scope of the task that introduces them.

## Voice

Write in a personal, professional, and direct voice. Use familiar words, complete
thoughts, and concrete observations. Technical maturity should come from clear
reasoning and accurate scope, rather than formal vocabulary, promotional claims,
or calling the author senior.

First person is appropriate for the author's experience, interests, and choices.
Use it selectively: the situation or project should remain the subject. Avoid
repeated accounts of what the author built when the paragraph can explain how
the work functions. Automated actions should be identifiable as automated;
interface feedback should describe the operation and its result clearly.

## Different purposes, one voice

| Surface                | Purpose                                        | Writing approach                                                                        |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Profile and experience | Establish the author's work and interests      | Short first-person passages with factual responsibilities and outcomes                  |
| Project preview        | Explain what a project is                      | One concise description of its purpose and distinguishing behavior                      |
| Expanded project       | Show the project and the engineering behind it | Brief context followed by a few specific architectural decisions and their consequences |
| Notes                  | Develop a thought or observation               | A coherent argument, with personal experience supporting the discussion                 |
| Interface              | Help someone act and understand the result     | Direct labels, short instructions, and accurate status or recovery messages             |

### Projects and experience

Read the relevant project documentation before drafting. Explain the need,
the implemented approach, and the consequences of that approach. Use specific
headings such as "Local recording and synchronization" when they help the
reader understand the design. Choose the important decisions for each project;
the entries do not need identical sections or a complete feature inventory.

Separate a documented mechanism from its motivation. Do not invent why a tool
was chosen, alternatives that were evaluated, performance gains, business
impact, adoption, team size, or personal responsibilities. Describe observed
behavior when the rationale is unknown. Preserve meaningful boundaries, such
as cooperative file reservations or a development experiment's temporary state.

Connect technology names to behavior or responsibility. Markdown headings,
paragraphs, and useful links should support the explanation. Keep source links
and code identifiers accurate; avoid repeating the repository link already
provided by the interface. Project bodies must follow the existing Markdown
contract and contain no level-one heading; see [Architecture](architecture.md).

### Notes

Let the central observation guide the article. Personal examples should make
the discussion concrete without turning the whole article into an introduction
to the portfolio. Preserve uncertainty where the author is reflecting on an
experience rather than stating a general conclusion.

Use standard spelling, capitalization, and punctuation in note titles and bodies.
The source is also used for narration, so sentences should read naturally aloud.
Do not lowercase the source to reproduce the interface's visual style. Follow
[Notes](notes.md) for text, audio, alignment, and publication contracts; old
narration or alignment must not be represented as matching revised text.

### Interface copy

Name the action or destination in labels. Keep recurring actions recognizable
throughout a flow. Preserve the personal tone in introductions and contact copy,
while keeping routine controls and operational feedback brief.

Match messages to the actual state. A field error can ask for a correction; an
operational failure should not imply that valid input is wrong. State confirmed
success precisely and give a next action only when it is useful and supported.
Avoid implementation terms that do not help the visitor decide what to do.

Keep visible labels, tooltips, accessible names, and status announcements
consistent in meaning. Announcements can use a complete sentence where a button
needs only a short label. Preserve existing user-facing limits and interpolation
tokens; do not change validation, timing, availability, or workflow behavior
through wording alone.

## Localization

French (`fr`), Spanish (`es`), Portuguese (`pt`, with the `pt-BR` language tag),
English (`en`), and Japanese (`ja`) are authored adaptations of the same meaning.
Rewrite sentence structure, rhythm, headings, and expressions for each language.
Preserve facts, scope, uncertainty, and the action a visitor is taking; equal
meaning does not require equal sentence count or literal phrasing. Notes remain
available only in English, Portuguese, and Japanese until their publication
workflow adds the other languages.

- Portuguese: use natural Brazilian Portuguese with a mature conversational
  register. Avoid English sentence patterns and unnecessary corporate language.
- French: use natural, concise French with a conversational professional register.
  Prefer idiomatic phrasing over literal translations and keep interface labels
  short.
- Spanish: use clear, natural Spanish with a conversational professional register.
  Avoid regionalisms that would unnecessarily narrow the audience.
- English: use idiomatic, concise prose and familiar engineering terminology.
  Preserve the author's personal voice without adding sales language.
- Japanese: use natural Japanese technical prose, generally with consistent
  `です・ます` narration. Keep interface labels concise and use familiar UI terms.
  Politeness should not introduce uncertainty into a fixed duration or a
  confirmed result.

Keep product and technology names intact: Aviões, Continuity, Shell, Workflows,
TypeScript, Node.js, and OpenAI. Use IA in Portuguese, French, and Spanish, and
AI in English and Japanese where the abbreviation is needed. The restrained
lowercase interface
is a presentation convention. The relevant components may apply it to rendered
profile, project, experience, and note copy. Preserve authored lowercase in
interface dictionaries where it is the existing convention, while keeping
normal orthography in editorial sources. Do not alter user-entered text, URLs,
identifiers, or code to match it.

## Content sources and maintenance

| Content                                                     | Source                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Localized interface, profile, experience, and page metadata | `src/i18n/dictionaries/{en,fr,es,pt,ja}.ts`, following `src/i18n/dictionary.ts`                         |
| Public identity and manifest fallback copy                  | `src/config/site.ts`                                                                                    |
| Profile and experience facts used by role comparison        | `src/content/portfolio.ts`                                                                              |
| Project descriptions and Markdown                           | `.portfolio/project.md`, `.portfolio/project.{fr,es,pt,ja}.md` when available in each source repository |
| Note text and publication data                              | The source and snapshot workflow documented in [Notes](notes.md)                                        |

Keep descriptions, summaries, highlights, metadata, and bodies consistent with
the same facts. Project snapshots under `.cache/` are derived data, not the
editorial source. Keep localized career descriptions aligned with the factual
profile used for role comparison. Review visitor-facing calendar or notification
text in its own delivery context when that content changes.

Before delivering a copy change, read the affected flow in context, including
labels, errors, success states, and destination links. Check grammar, locale
adaptation, factual scope, and interpolation tokens. Use the existing relevant
checks; report visual or live-service verification as pending when it was not
performed. Browser and visual verification remain opt-in under the project's
contribution rules.
