#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

export const MIN_ANON_SESSION_SECRET_LENGTH = 32;

const REQUIRED_PRODUCTION_VALUES = [
  "GITHUB_OWNER",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "ANON_SESSION_SECRET",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
];
const OPTIONAL_RESEND_GROUP = [
  "RESEND_API_KEY",
  "MEETING_OWNER_EMAIL",
  "RESEND_FROM_EMAIL",
];

export function validateProductionEnvironment(environment = process.env) {
  const errors = [];

  for (const name of REQUIRED_PRODUCTION_VALUES) {
    if (!environment[name]?.trim()) {
      errors.push(`${name} is required.`);
    }
  }

  const owner = environment.GITHUB_OWNER?.trim();
  if (owner && !/^[A-Za-z0-9_.-]+$/.test(owner)) {
    errors.push("GITHUB_OWNER contains unsupported characters.");
  }

  const redisUrl = environment.KV_REST_API_URL?.trim();
  if (redisUrl && !hasProtocol(redisUrl, ["https:"])) {
    errors.push("KV_REST_API_URL must be a valid HTTPS URL.");
  }

  const sessionSecret = environment.ANON_SESSION_SECRET?.trim();
  if (
    sessionSecret &&
    sessionSecret.length < MIN_ANON_SESSION_SECRET_LENGTH
  ) {
    errors.push(
      `ANON_SESSION_SECRET must contain at least ${MIN_ANON_SESSION_SECRET_LENGTH} characters.`,
    );
  }

  const configuredResendValues = OPTIONAL_RESEND_GROUP.filter((name) =>
    environment[name]?.trim(),
  );
  if (
    configuredResendValues.length > 0 &&
    configuredResendValues.length !== OPTIONAL_RESEND_GROUP.length
  ) {
    errors.push(
      `Configure all of ${OPTIONAL_RESEND_GROUP.join(", ")} or leave all three unset.`,
    );
  }

  const ownerEmail = environment.MEETING_OWNER_EMAIL?.trim();
  if (ownerEmail && !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
    errors.push("MEETING_OWNER_EMAIL must be a valid email address.");
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid production environment:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  return {
    meetingNotificationEnabled:
      configuredResendValues.length === OPTIONAL_RESEND_GROUP.length,
  };
}

function hasProtocol(value, protocols) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function main() {
  loadEnvConfig(process.cwd(), false, console, true);
  const result = validateProductionEnvironment();
  console.log(
    `Production environment is valid. Optional owner notification is ${result.meetingNotificationEnabled ? "enabled" : "disabled"}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
