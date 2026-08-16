import Constants from "expo-constants";

// §15.1 — API base URL resolution. Never silently point at localhost in a
// production build.
//
// Resolution order:
//   1. `EXPO_PUBLIC_API_URL` — baked in at build time (e.g. the deployed
//      Xenboox API origin https://xenboox.vercel.app).
//   2. Dev: the Expo dev-server host (physical device / emulator) with the
//      web server port — http://<host>:3000.
//   3. Dev with no dev server host: http://localhost:3000.
//   4. Production with no EXPO_PUBLIC_API_URL: throw a clear error instead
//      of shipping an app that calls localhost.

const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  APP_NAME: "Xenboox",
  APP_VERSION: Constants.expoConfig?.version || "1.0.0",
} as const;

export function getApiUrl(): string {
  if (__DEV__) {
    const debuggerHost =
      Constants.expoConfig?.hostUri ??
      Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(":")[0];
      return `http://${host}:3000`;
    }
    return ENV.API_URL || "http://localhost:3000";
  }
  if (ENV.API_URL) return ENV.API_URL;
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Set it to the deployed Xenboox API " +
      "origin (e.g. https://xenboox.vercel.app) when building the mobile app.",
  );
}

export function getConfig() {
  return {
    apiUrl: getApiUrl(),
    appName: ENV.APP_NAME,
    appVersion: ENV.APP_VERSION,
  };
}
