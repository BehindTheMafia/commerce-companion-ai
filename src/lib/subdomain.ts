import { supabase } from "@/integrations/supabase/client";

const APP_DOMAINS = [
  "vercel.app",
  "localhost",
  "commerce-companion-ai.vercel.app",
];

export function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;
  const parts = host.split(".");
  if (parts.length > 2 && parts[0] !== "www") {
    return parts[0];
  }
  return null;
}

export async function resolveBusinessBySlug(slug: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, currency")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export function getSubdomainUrl(slug: string): string {
  if (typeof window === "undefined") return `/${slug}`;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${slug}.localhost:${window.location.port}`;
  }
  const parts = host.split(".");
  const base = parts.slice(-2).join(".");
  return `${slug}.${base}`;
}