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
    <div className={cn("space-y-2", className)}>
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="preview"
            className="h-32 w-32 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="size-4" />
            {value ? "Cambiar imagen" : "Subir imagen"}
          </>
        )}
      </div>

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
