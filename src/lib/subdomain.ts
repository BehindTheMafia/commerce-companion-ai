import { supabase } from "@/integrations/supabase/client";

const ROOT_DOMAINS = [
  "hyperbeecommerce.vercel.app",
  "localhost",
];

export function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  const parts = host.split(".");
  if (parts[0] === "www") return null;

  const hasSubdomain = ROOT_DOMAINS.some((root) => {
    const rootParts = root.split(".");
    return (
      parts.length === rootParts.length + 1 &&
      host.endsWith(root)
    );
  });

  return hasSubdomain ? parts[0] : null;
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
  const port = window.location.port;
  if (getSubdomain()) {
    return `${slug}${host.slice(host.indexOf("."))}`;
  }
  const root = ROOT_DOMAINS.find((d) => host.endsWith(d) || d === "localhost");
  if (!root) return `${slug}.${host}`;
  if (root === "localhost") return `${slug}.localhost${port ? ":" + port : ""}`;
  return `${slug}.${root}`;
}