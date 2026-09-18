/** Keep each audio source on an explicit baseline; the engines have different native gains. */
export const soundLevels = {
  cuelume: 0.75,
  typing: { master: 1, cue: 0.3 },
  noteNarration: 0.7,
} as const
