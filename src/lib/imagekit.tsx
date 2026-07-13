import { ImageKitProvider } from "@imagekit/react";
import type { ReactNode } from "react";

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT as string;

export function ImageKitWrapper({ children }: { children: ReactNode }) {
  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      {children}
    </ImageKitProvider>
  );
}
