import pino, { type Logger, type LoggerOptions } from "pino";

const globalLogger = globalThis as typeof globalThis & {
  portfolioLogger?: Logger;
};

const options: LoggerOptions = {
  base: { service: "portfolio" },
  level:
    process.env.NODE_ENV === "test"
      ? "silent"
      : process.env.NODE_ENV === "development"
        ? "debug"
        : "info",
  redact: {
    paths: [
      "authorization",
      "cookie",
      "ip",
      "message",
      "name",
      "*.authorization",
      "*.cookie",
      "*.ip",
      "*.message",
      "*.name",
    ],
    remove: true,
  },
};

function createLogger() {
  if (process.env.NODE_ENV !== "development") {
    return pino(options);
  }

  return pino(
    options,
    pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        singleLine: true,
        translateTime: "SYS:standard",
      },
    }),
  );
}

export const logger = (globalLogger.portfolioLogger ??= createLogger());
