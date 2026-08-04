import type { DeviceInfo } from "./types";

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/crios/i.test(ua)) return "Chrome";
  if (/crios/i.test(ua)) return "Chrome iOS";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  return "Desconocido";
}

function detectPlatform(ua: string): string {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua) || /macintosh/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Otro";
}

/** Detect device metadata to store alongside each push subscription. */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent ?? "";
  const platform = detectPlatform(ua);
  const browser = detectBrowser(ua);
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const model = nav.userAgentData?.platform ?? "";
  const deviceName = model ? `${platform} · ${browser} (${model})` : `${platform} · ${browser}`;

  return { deviceName: deviceName.slice(0, 120), browser, platform };
}
