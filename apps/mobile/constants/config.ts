import Constants from "expo-constants"

const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  APP_NAME: "Xenboox",
  APP_VERSION: Constants.expoConfig?.version || "1.0.0"
} as const

export function getApiUrl(): string {
  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    if (debuggerHost) {
      const host = debuggerHost.split(":")[0]
      return `http://${host}:3000`
    }
  }
  return ENV.API_URL
}

export function getConfig() {
  return {
    apiUrl: getApiUrl(),
    appName: ENV.APP_NAME,
    appVersion: ENV.APP_VERSION
  }
}
