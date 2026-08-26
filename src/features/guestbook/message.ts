import { z } from "zod";

export const MAX_NAME_LENGTH = 60;
export const MAX_MESSAGE_LENGTH = 500;

export const SubmittedGeoCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type SubmittedGeoCoordinates = z.infer<
  typeof SubmittedGeoCoordinatesSchema
>;

export type GeoCoordinates = SubmittedGeoCoordinates & {
  country: string | null;
  city: string | null;
};

export type GuestbookMessage = {
  id: string;
  name: string;
  message: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
};

export const GuestbookSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_NAME_LENGTH)
      .optional()
      .catch(undefined),
    message: z
      .string()
      .trim()
      .min(1)
      .max(MAX_MESSAGE_LENGTH)
      .optional()
      .catch(undefined),
    location: SubmittedGeoCoordinatesSchema.optional().catch(undefined),
  })
  .catch({});

export type GuestbookSubmission = z.infer<typeof GuestbookSubmissionSchema>;

export function validateSubmittedGeoCoordinates(
  value: unknown,
): SubmittedGeoCoordinates | undefined {
  const parsed = SubmittedGeoCoordinatesSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function validateSubmission(body: unknown): GuestbookSubmission {
  return GuestbookSubmissionSchema.parse(body);
}
