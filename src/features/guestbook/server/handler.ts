import {
  json,
  protect,
  readJson,
  unavailable,
  withSession,
} from "@/lib/abuse-protection";
import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  validateSubmission,
} from "@/features/guestbook/message";
import { moderateMessage } from "@/features/guestbook/server/moderate-message";
import { resolveGeo } from "@/features/guestbook/server/geo";
import { createMessage } from "@/features/guestbook/server/db/client";

export type GuestbookDependencies = {
  protect: typeof protect;
  readJson: typeof readJson;
  moderateMessage: typeof moderateMessage;
  resolveGeo: typeof resolveGeo;
  createMessage: typeof createMessage;
};

const defaultDependencies: GuestbookDependencies = {
  protect,
  readJson,
  moderateMessage,
  resolveGeo,
  createMessage,
};

export function createGuestbookPost(
  overrides: Partial<GuestbookDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: Request) {
    // Preserve the deployed visitorGlobe protection bucket during the rename.
    const protection = await dependencies.protect("visitorGlobe", request);
    if (protection instanceof Response) {
      return protection;
    }

    const parsed = await dependencies.readJson(request, "visitorGlobe");
    if (parsed.response) {
      return withSession(parsed.response, protection.sessionCookie);
    }

    const submission = validateSubmission(parsed.body);
    if (!submission.name || !submission.message) {
      return withSession(
        json(
          {
            error: `Provide a name (up to ${MAX_NAME_LENGTH} characters) and a message (up to ${MAX_MESSAGE_LENGTH} characters).`,
          },
          400,
        ),
        protection.sessionCookie,
      );
    }

    const geo = dependencies.resolveGeo(request);
    if (!geo) {
      return withSession(
        json({ error: "Your location could not be resolved right now." }, 503),
        protection.sessionCookie,
      );
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return withSession(
        json({ error: "The visitor globe is not configured yet." }, 503),
        protection.sessionCookie,
      );
    }

    const moderation = await dependencies.moderateMessage(
      submission.name,
      submission.message,
      protection.identity,
    );

    // Fail closed: if the guardrail cannot classify, do not persist.
    if (!moderation) {
      return withSession(unavailable(), protection.sessionCookie);
    }

    if (!moderation.approved) {
      return withSession(
        json(
          {
            error:
              "Your message could not be published. Please keep it respectful and relevant.",
          },
          422,
        ),
        protection.sessionCookie,
      );
    }

    try {
      await dependencies.createMessage({
        name: submission.name,
        message: submission.message,
        latitude: geo.latitude,
        longitude: geo.longitude,
        country: geo.country,
        city: geo.city,
      });
      return withSession(
        Response.json({ ok: true }, { status: 201 }),
        protection.sessionCookie,
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "visitor_globe_persistence_failure",
          kind: error instanceof Error ? error.name : "unknown",
        }),
      );
      return withSession(
        json({ error: "Unable to publish your message right now." }, 502),
        protection.sessionCookie,
      );
    }
  };
}
