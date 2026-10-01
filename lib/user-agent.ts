/**
 * Minimal, dependency-free User-Agent classification.
 *
 * The raw `User-Agent` string is **not** stored — it is parsed once on the
 * server and reduced to three high-level signals. That keeps the dataset small
 * and avoids retaining a value that can act as a fingerprint.
 */

import { DEVICE_TYPES, type DeviceType } from "@/types/analytics";

export type { DeviceType };
export { DEVICE_TYPES };

export interface UserAgentInfo {
  deviceType: DeviceType;
  browser: string | null;
  operatingSystem: string | null;
}

/** Header sent by headless browsers and well-behaved crawlers. */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|headlesschrome|phantomjs|curl\/|wget\/|python-requests|axios\/|go-http-client|node-fetch|postman|insomnia|apache-httpclient|java\/|okhttp/i;

const TABLET_PATTERN = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;
const MOBILE_PATTERN = /mobile|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/i;

/**
 * Ordered most-specific-first: several browsers advertise tokens for the engines
 * they embed (Edge mentions Chrome, Chrome mentions Safari), so the first match
 * wins.
 */
const BROWSER_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /edg(?:e|a|ios)?\//i, name: "Edge" },
  { pattern: /opr\/|opera/i, name: "Opera" },
  { pattern: /samsungbrowser/i, name: "Samsung Internet" },
  { pattern: /yabrowser|ya browser/i, name: "Yandex Browser" },
  { pattern: /vivaldi/i, name: "Vivaldi" },
  { pattern: /brave/i, name: "Brave" },
  { pattern: /ucbrowser|uc browser/i, name: "UC Browser" },
  { pattern: /fxios|firefox/i, name: "Firefox" },
  { pattern: /crios|chrome/i, name: "Chrome" },
  { pattern: /safari/i, name: "Safari" },
  { pattern: /msie|trident/i, name: "Internet Explorer" },
];

const OS_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /windows nt|windows phone|win64|win32/i, name: "Windows" },
  { pattern: /iphone|ipad|ipod|ios/i, name: "iOS" },
  { pattern: /android/i, name: "Android" },
  { pattern: /mac os x|macintosh/i, name: "macOS" },
  { pattern: /cros/i, name: "ChromeOS" },
  { pattern: /ubuntu/i, name: "Ubuntu" },
  { pattern: /fedora/i, name: "Fedora" },
  { pattern: /debian/i, name: "Debian" },
  { pattern: /linux/i, name: "Linux" },
];

function firstMatch(rules: { pattern: RegExp; name: string }[], value: string): string | null {
  for (const rule of rules) {
    if (rule.pattern.test(value)) return rule.name;
  }
  return null;
}

function detectDeviceType(userAgent: string): DeviceType {
  if (BOT_PATTERN.test(userAgent)) return "bot";
  if (TABLET_PATTERN.test(userAgent)) return "tablet";
  if (MOBILE_PATTERN.test(userAgent)) return "mobile";
  if (userAgent.length === 0) return "other";
  return "desktop";
}

/**
 * Classifies a `User-Agent` header.
 *
 * @param userAgent Raw header value; `null`/absent yields all-`unknown` fields.
 */
export function parseUserAgent(userAgent: string | null | undefined): UserAgentInfo {
  if (!userAgent || userAgent.trim().length === 0) {
    return { deviceType: "other", browser: null, operatingSystem: null };
  }

  const value = userAgent.trim();

  return {
    deviceType: detectDeviceType(value),
    browser: firstMatch(BROWSER_RULES, value),
    operatingSystem: firstMatch(OS_RULES, value),
  };
}

/** Human-readable label for a device type. */
export function formatDeviceType(deviceType: string | null | undefined): string {
  if (!deviceType) return "Not available";
  switch (deviceType) {
    case "desktop":
      return "Desktop";
    case "mobile":
      return "Mobile";
    case "tablet":
      return "Tablet";
    case "bot":
      return "Bot";
    default:
      return "Other";
  }
}

/** Tracks whether a visitor record came from a non-human client. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent.trim());
}
