import {
  assessRoleFit,
  MAX_ROLE_DESCRIPTION_LENGTH,
  parseRoleDescription,
} from "@/features/role-fit/assess-role-fit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a role description as JSON." },
      { status: 400 },
    );
  }

  const description = parseRoleDescription(body);
  if (!description) {
    return Response.json(
      {
        error: `Provide a role description of up to ${MAX_ROLE_DESCRIPTION_LENGTH.toLocaleString("en-US")} characters.`,
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "The fit assessment is not configured yet." },
      { status: 503 },
    );
  }

  try {
    return Response.json({ answer: await assessRoleFit(description) });
  } catch {
    return Response.json(
      { error: "Unable to assess fit right now." },
      { status: 502 },
    );
  }
}
