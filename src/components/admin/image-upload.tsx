import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import { getImageKitAuth } from "@/lib/imagekit-auth";

const IK_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string;

type Props = {
  value: string;
  onChange: (url: string) => void;
  className?: string;
};

export function ImageUpload({ value, onChange, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!IK_PUBLIC_KEY) {
      alert("Error: VITE_IMAGEKIT_PUBLIC_KEY no está configurada");
      return;
    }
    setUploading(true);
    try {
      const { token, expire, signature } = await getImageKitAuth();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", IK_PUBLIC_KEY);
      formData.append("useUniqueFileName", "true");
      formData.append("signature", signature);
      formData.append("token", token);
      formData.append("expire", String(expire));

      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      onChange(data.url as string);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al subir la imagen: " + msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      {value ? (
        <div className="relative group/image w-40 aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shadow-sm">
          <img
            src={value}
            alt="preview"
            className="size-full object-cover transition-transform duration-500 group-hover/image:scale-105"
          />
          {/* Glassmorphic hover overlay for desktop */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-white pointer-events-none backdrop-blur-[1px]">
            <Upload className="size-4 animate-pulse" />
            <span className="text-[11px] font-medium tracking-tight">Cambiar imagen</span>
          </div>
          {/* Trigger area to click and change image */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            disabled={uploading}
            aria-label="Cambiar imagen"
          />
          {/* Small remove button, always visible and highly accessible */}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-zinc-950/70 hover:bg-destructive active:scale-90 text-zinc-100 hover:text-white transition-all duration-150 shadow-md border border-white/10"
            aria-label="Eliminar imagen"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "group flex aspect-square w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.02] hover:text-primary active:scale-[0.98]",
            uploading && "pointer-events-none opacity-50",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="font-medium">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="size-4 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">Subir imagen</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
