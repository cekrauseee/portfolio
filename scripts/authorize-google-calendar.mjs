#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { google } from "googleapis";

const host = "localhost";
const port = 53_682;
const callbackPath = "/oauth2callback";
const redirectUri = `http://${host}:${port}${callbackPath}`;
const envPath = resolve(".env.local");
const scopes = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
];

if (process.argv.includes("--help")) {
  console.log(`Authorize the portfolio to access one Google Calendar account.

Usage:
  npm run calendar:authorize

Before running, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local or
.env. Web OAuth clients must allow this redirect URI:
  ${redirectUri}

The resulting refresh token is saved to .env.local and is never printed.`);
  process.exit(0);
}

let clientId;
let clientSecret;

try {
  clientId = requiredConfig("GOOGLE_CLIENT_ID");
  clientSecret = requiredConfig("GOOGLE_CLIENT_SECRET");
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Unable to read Google OAuth credentials.",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri,
);
const state = randomBytes(32).toString("base64url");
const codeVerifier = randomBytes(64).toString("base64url");
const codeChallenge = createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

let completeAuthorization;
let failAuthorization;
const authorization = new Promise(
  (resolveAuthorization, rejectAuthorization) => {
    completeAuthorization = resolveAuthorization;
    failAuthorization = rejectAuthorization;
  },
);

let callbackHandled = false;
const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", redirectUri);

  if (requestUrl.pathname !== callbackPath) {
    response.writeHead(404).end("Not found.");
    return;
  }

  if (callbackHandled) {
    response.writeHead(409).end("Authorization was already handled.");
    return;
  }

  callbackHandled = true;
  const error = requestUrl.searchParams.get("error");
  const returnedState = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");

  if (error) {
    response.writeHead(400).end("Google authorization was declined.");
    failAuthorization(new Error(`Google authorization failed: ${error}.`));
    return;
  }

  if (returnedState !== state) {
    response.writeHead(400).end("Invalid authorization state.");
    failAuthorization(new Error("Google returned an invalid OAuth state."));
    return;
  }

  if (!code) {
    response.writeHead(400).end("Missing authorization code.");
    failAuthorization(
      new Error("Google did not return an authorization code."),
    );
    return;
  }

  completeAuthorization({ code, response });
});

try {
  await listen(server);
  server.on("error", (error) => failAuthorization(error));

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state,
  });

  console.log("Opening Google authorization in your browser.");
  console.log(`If it does not open, visit:\n${authorizationUrl}`);
  openBrowser(authorizationUrl);

  const { code, response } = await withTimeout(authorization, 5 * 60_000);

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier,
      redirect_uri: redirectUri,
    });

    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Revoke the existing app grant and run the authorization again.",
      );
    }

    writeEnvValue(envPath, "GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
    response
      .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Google Calendar authorization complete. You can close this tab.");
    console.log("Saved GOOGLE_REFRESH_TOKEN to .env.local.");
  } catch (error) {
    response
      .writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Unable to complete Google Calendar authorization.");
    throw error;
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Unable to authorize Google Calendar.",
  );
  process.exitCode = 1;
} finally {
  await close(server);
}

function requiredConfig(name) {
  const value = configValue(name);
  if (!value) {
    throw new Error(`Set ${name} in .env.local or .env before authorizing.`);
  }
  return value;
}

function configValue(name) {
  const processValue = process.env[name]?.trim();
  if (processValue) {
    return processValue;
  }

  for (const path of [resolve(".env.local"), resolve(".env")]) {
    if (!existsSync(path)) {
      continue;
    }
    const value = parseEnv(readFileSync(path, "utf8"))[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function writeEnvValue(path, name, value) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new Error(
      "Refusing to write GOOGLE_REFRESH_TOKEN through a symlink.",
    );
  }

  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${name}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${line}\n`;
  const temporaryPath = `${path}.${process.pid}.tmp`;

  writeFileSync(temporaryPath, next, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPath, path);
  chmodSync(path, 0o600);
}

function listen(httpServer) {
  return new Promise((resolveListen, rejectListen) => {
    httpServer.once("error", rejectListen);
    httpServer.listen(port, host, () => {
      httpServer.off("error", rejectListen);
      resolveListen();
    });
  });
}

function close(httpServer) {
  if (!httpServer.listening) {
    return Promise.resolve();
  }
  return new Promise((resolveClose) => httpServer.close(resolveClose));
}

function withTimeout(promise, timeoutMs) {
  let timeout;
  const result = Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Google authorization timed out.")),
        timeoutMs,
      );
    }),
  ]);
  return result.finally(() => clearTimeout(timeout));
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];

  try {
    const child = spawn(command[0], command[1], {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // The authorization URL is already printed as a manual fallback.
  }
}
