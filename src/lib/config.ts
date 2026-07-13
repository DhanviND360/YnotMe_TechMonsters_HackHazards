import Constants from "expo-constants";

function getDevApiBaseUrl() {
  const constants = Constants as typeof Constants & {
    expoConfig?: { hostUri?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };
  const hostUri = constants.expoConfig?.hostUri ?? constants.manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(":")[0];
  if (!host) {
    console.warn("[YnotMe] Could not detect LAN IP. Set EXPO_PUBLIC_API_BASE_URL in .env");
  }
  return host ? `http://${host}:8080/api` : "http://localhost:8080/api";
}

const resolvedUrl = process.env.EXPO_PUBLIC_API_BASE_URL || getDevApiBaseUrl();
console.log("[YnotMe] API base URL:", resolvedUrl, process.env.EXPO_PUBLIC_API_BASE_URL ? "(from env)" : "(auto-detected)");

export const config = {
  apiBaseUrl: resolvedUrl
};

export const isApiConfigured = Boolean(config.apiBaseUrl);
