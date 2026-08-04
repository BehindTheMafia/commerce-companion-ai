#!/usr/bin/env node
/**
 * Generates VAPID keys for Web Push and prints the env vars to add.
 * Run once, keep the private key secret:
 *   node scripts/generate-vapid.mjs
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n  VAPID keys generated. Add these to your environment:\n");
console.log(`  VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`  VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`  VAPID_SUBJECT="mailto:admin@yourdomain.com"`);
console.log(`  VITE_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log("\n  VITE_VAPID_PUBLIC_KEY is safe to ship to the browser; the private key is not.\n");
