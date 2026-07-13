import { createServerFn } from "@tanstack/react-start";
import { createHmac, randomUUID } from "node:crypto";

export const getImageKitAuth = createServerFn({ method: "GET" }).handler(async () => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("IMAGEKIT_PRIVATE_KEY not set on server");
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;

  const signature = createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  return { token, expire, signature };
});
