import pino from "pino";

function createTransport() {
  if (process.env.NODE_ENV === "development" && process.env.VITEST !== "true") {
    try {
      return {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss" },
      };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: createTransport(),
  base: { service: "xenboox-web" },
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
