/** The engines have different native gains; equal percentages do not sound equally loud. */
export const soundLevels = {
  cuelume: 0.25,
  typing: { master: 0.8, cue: 0.12 },
} as const
