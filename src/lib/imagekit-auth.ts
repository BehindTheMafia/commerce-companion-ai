import { createServerFn } from "@tanstack/react-start";
import { createHmac, randomUUID } from "node:crypto";

export const getImageKitAuth = createServerFn({ method: "GET" }).handler(async () => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.VITE_IMAGEKIT_PUBLIC_KEY;
  if (!privateKey || !publicKey) {
    throw new Error("ImageKit keys not set on server");
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;

  const signature = createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  return { publicKey, token, expire, signature };
});
