# Notes

Published notes come from the standalone notes repository at build time. The
portfolio reads `.notes/manifest.json` and the exact Markdown files named by
each published manifest entry, validates their SHA-256 hashes, and writes the
result to `.cache/notes.json`. Visitor requests never call GitHub, the notes
repository, or ElevenLabs. Opening a note at `/notes/[slug]` fetches the
published alignment artifact and prepares its audio directly from public Blob
URLs. Notes have dedicated reading pages but no index route.

The manifest must contain only published entries with `en`, `pt`, and `ja`
locales. Each locale source must follow the shared canonical Markdown-to-speech
projection and match `markdownSha256` and `spokenTextSha256`. Audio and alignment URLs must be
HTTPS Vercel Blob URLs. Drafts remain in the notes repository but are absent
from the published manifest and portfolio snapshot.

## Configuration

`NOTES_REPOSITORY` is optional. Set it to the explicit `owner/repository` value
for production, for example `cekrauseee/notes`. `NOTES_REF` selects the source
ref and defaults to `main`; the sync resolves that ref to a 40-character commit
SHA before reading any source. `GITHUB_TOKEN` is optional and is used only to
raise the public GitHub API rate limit.

During local development, leaving `NOTES_REPOSITORY` empty reads `../notes`.
If a configured remote source fails in development, the sync warns and tries
`NOTES_LOCAL_PATH` (default `../notes`) with the same content validation. If both
sources fail, the error reports both failures and preserves the previous snapshot.
Local development reads the current Markdown working tree, including drafts
and published text that has no audio manifest yet. These snapshots are tagged
`local-preview` and rejected by the production loader, including when sync is
skipped. After the Notes project runs `npm run notes:generate -- --note
<id> --no-upload`, the sync detects matching files under
`.notes/generated/<id>/<locale>/<generation-hash>/` and exposes them through
the development-only `/api/notes-assets/` route. The reader omits audio
controls when no matching local or published audio exists; unchanged published
narration is reused when its spoken-text hash matches. Local preview does not
generate audio or modify the publisher's manifest. Rerun notes sync after
generating audio or changing local Markdown.

Set `NOTES_LOCAL_PATH` to override that path. This is a development/offline
option and is not used by production sync. If production has no
`NOTES_REPOSITORY`, the sync writes an intentional empty snapshot. If a
repository is configured and its manifest or source is unavailable, the build
fails and keeps the failure visible.

Run `npm run notes:sync -- --mode=development` to refresh the local snapshot.
`npm run dev` and `npm run build` run the sync through their lifecycle hooks.
CI sets `NOTES_SYNC_SKIP=1` and copies `fixtures/notes.json` so tests and the
fixture-backed build do not contact GitHub.

The notes publisher uses ElevenLabs to generate audio and timestamps together.
Set `ELEVENLABS_API_KEY` and a Voice ID in the **notes** repository's generation
environment, alongside its existing Blob token. No ElevenLabs credential belongs
in the portfolio browser or runtime. The reader accepts both new
`elevenlabs-character-timestamps` artifacts and existing published
`whisper-1-transcription-word-timestamps` artifacts. Notes retain normal source
capitalization and are displayed in lowercase through CSS.

## Reader behavior

The homepage shows up to three recent published notes after experience. Each
links to `/notes/[slug]`; there is no “all notes” link. Opening a reading page
mounts its audio element with `preload="none"` and starts an alignment request.
Audio loads on an explicit play request and never autoplays. The homepage cards
mount neither audio nor alignment requests. Leaving or switching notes aborts
the alignment request, pauses audio, removes its source, and invalidates pending
play promises. A dedicated reading toolbar provides playback, appearance,
language and return controls.

Alignment is checked against the note id, locale, canonical spoken text,
UTF-16 source offsets, monotonic time bounds, duplicate spans, and complete
significant-text coverage. Punctuation and whitespace gaps are allowed; missing
spoken words are rejected. A genuine timestamp span may cover multiple words,
including equivalent Japanese segmentation, without invented subword timings.
If alignment
or audio fails, the original Markdown remains readable and the localized error
offers a retry. No unsynchronized highlighting is shown. Playback time drives
the current, said, and upcoming unit states; seeking and playback-rate changes
use the native audio element.

## Publication delivery hook

The portfolio receiver is `.github/workflows/reconcile-projects.yml`. The notes
publisher should send this request after it has committed and pushed the new manifest:

```http
POST https://api.github.com/repos/<portfolio-owner>/<portfolio-repository>/dispatches
Authorization: Bearer <token>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json

{"event_type":"notes-published","client_payload":{"notes_commit":"<40-char-lowercase-sha>"}}
```

The token must be allowed to dispatch repository events on the portfolio
repository. Store it in the notes repository as a secret; no token belongs in
the notes content or browser. The receiver accepts only the typed
`notes-published` event on the portfolio `main` branch and validates the
lowercase 40-character `notes_commit` field. It uses the existing migration and
Vercel Deploy Hook delivery job. The receiver does not fetch note content from
the event payload; the Vercel build performs the authoritative pinned sync. The notification SHA
is validated but is not forwarded as a build override. The build resolves the
configured `NOTES_REF` to a commit and reads all note sources from that revision,
which may be newer than the revision that triggered the notification.
