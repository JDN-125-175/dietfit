import { Platform } from "react-native";
import Constants from "expo-constants";

/** Only use auto-detected host if it looks like a LAN IP (device can reach your computer). */
function isLikelyLanHost(host: string): boolean {
  return (JAC
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function extractHostFromUri(uri: string): string | null {
  const match = uri.match(/^(?:exp|expo):\/\/([^:/]+)/);
  return match ? match[1] : null;
}

/**
 * API base URL for web, Android emulator, iOS simulator, and real devices.
 * - Web: localhost
 * - Android emulator: 10.0.2.2 (special alias to host machine)
 * - iOS simulator: localhost (shares host network)
 * - Real device: LAN IP from Expo or EXPO_PUBLIC_API_URL in .env
 */
export function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.replace(/\/$/, "");
  }
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }
  // On native: try LAN host from Expo (for real device on same WiFi)
  try {
    const expoConfig = Constants.expoConfig as { hostUri?: string } | null;
    const hostUri = expoConfig?.hostUri ?? Constants.linkingUri ?? "";
    const host = hostUri
      ? extractHostFromUri(hostUri) ?? hostUri.split(":")[0]
      : null;
    if (host && isLikelyLanHost(host)) {
      return `http://${host}:3000`;
    }
  } catch (_) {
    // ignore
  }
  // Android emulator: localhost points to emulator itself; 10.0.2.2 is the host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  // iOS simulator: localhost works (simulator shares host network)
  return "http://localhost:3000";
}
