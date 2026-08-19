import {
  assessRoleFit,
  MAX_ROLE_DESCRIPTION_LENGTH,
  parseRoleDescription,
} from "@/features/role-fit/assess-role-fit";
import {
  acquire,
  json,
  protect,
  ProtectionUnavailableError,
  readJson,
  release,
  unavailable,
  withSession,
} from "@/lib/abuse-protection";

export const runtime = "nodejs";

type FitDependencies = {
  protect: typeof protect;
  readJson: typeof readJson;
  acquire: typeof acquire;
  release: typeof release;
  assessRoleFit: typeof assessRoleFit;
};

const defaultDependencies: FitDependencies = {
  protect,
  readJson,
  acquire,
  release,
  assessRoleFit,
};

async function releaseBestEffort(
  releaseLock: FitDependencies["release"],
  key: string,
  owner: string | false,
) {
  try {
    await releaseLock(key, owner);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "abuse_lock_release_failure",
        operation: "fit",
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}

export function createFitPost(overrides: Partial<FitDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  return async function POST(request: Request) {
    const protection = await dependencies.protect("fit", request);
    if (protection instanceof Response) {
      return protection;
    }
    const parsed = await dependencies.readJson(request, "fit");
    if (parsed.response) {
      return withSession(parsed.response, protection.sessionCookie);
    }
    const body = parsed.body;

    const description = parseRoleDescription(body);
    if (!description) {
      return withSession(
        json(
          {
            error: `Provide a role description of up to ${MAX_ROLE_DESCRIPTION_LENGTH.toLocaleString("en-US")} characters.`,
          },
          400,
        ),
        protection.sessionCookie,
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return withSession(
        json({ error: "The fit assessment is not configured yet." }, 503),
        protection.sessionCookie,
      );
    }

    const lockKey = `fit:${protection.identity}`;
    try {
      const lockOwner = await dependencies.acquire(lockKey, 90);
      if (!lockOwner) {
        return withSession(
          json(
            {
              error:
                "A fit assessment is already in progress. Please try again shortly.",
            },
            429,
            30,
          ),
          protection.sessionCookie,
        );
      }
      let result: Response;
      try {
        result = withSession(
          Response.json({
            answer: await dependencies.assessRoleFit(
              description,
              protection.identity,
            ),
          }),
          protection.sessionCookie,
        );
      } catch {
        result = withSession(
          json({ error: "Unable to assess fit right now." }, 502),
          protection.sessionCookie,
        );
      }
      await releaseBestEffort(dependencies.release, lockKey, lockOwner);
      return result;
    } catch (error) {
      if (error instanceof ProtectionUnavailableError) {
        return withSession(unavailable(), protection.sessionCookie);
      }
      return withSession(
        json({ error: "Unable to assess fit right now." }, 502),
        protection.sessionCookie,
      );
    }
  };
}

export const POST = createFitPost();
