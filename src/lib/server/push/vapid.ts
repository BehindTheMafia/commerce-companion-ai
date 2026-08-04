import webpush from "web-push";

/**
 * VAPID configuration for web-push.
 *
 * Keys are generated with `node scripts/generate-vapid.mjs` and stored in env:
 *   VAPID_PUBLIC_KEY   (public — safe to expose, also as VITE_VAPID_PUBLIC_KEY)
 *   VAPID_PRIVATE_KEY  (private — server only, never expose)
 *   VAPID_SUBJECT      (mailto: or https: contact, required by browsers)
 */
export function getVapidDetails(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@commerce.ai";

  if (!publicKey || !privateKey) {
    throw new Error(
      "[push] VAPID keys missing. Run `node scripts/generate-vapid.mjs` and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.",
    );
  }

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string {
  return getVapidDetails().publicKey;
}

/**
 * Returns a configured `web-push` instance (lazy — configures once per call).
 */
export function getWebPush(): typeof webpush {
  const { publicKey, privateKey, subject } = getVapidDetails();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}
