import { createServerFn } from "@tanstack/react-start";

export const getImageKitAuth = createServerFn({ method: "GET" }).handler(async () => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!;

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const msgData = encoder.encode(token + expire);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgData);

  const signature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { token, expire, signature };
});
