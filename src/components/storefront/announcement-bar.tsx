import { Megaphone } from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";
import type { Business } from "@/types/storefront";

type AnnouncementBarProps = {
  business: Business | null | undefined;
};

export function AnnouncementBar({ business }: AnnouncementBarProps) {
  const settings = useStoreSettings(business);
  const { enabled, text } = settings.announcement;

  if (!enabled || !text) return null;

  return (
    <div className="relative z-30 w-full bg-primary px-4 py-2">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-xs font-medium text-primary-foreground text-balance sm:text-[13px]">
        <Megaphone className="size-3.5 shrink-0 opacity-80" strokeWidth={2} />
        {text}
      </p>
    </div>
  );
}
