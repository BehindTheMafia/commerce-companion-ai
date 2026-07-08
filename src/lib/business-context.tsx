import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Business = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
};

type Ctx = {
  businesses: Business[];
  activeBusiness: Business | null;
  setActiveBusinessId: (id: string) => void;
  loading: boolean;
  refetch: () => void;
};

const BusinessCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "commerce_ai_active_business";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-businesses"],
    queryFn: async (): Promise<Business[]> => {
      const { data, error } = await supabase
        .from("memberships")
        .select("business:businesses(id,name,slug,logo_url,currency)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.business as unknown as Business)
        .filter(Boolean);
    },
  });

  const businesses = data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveId(stored);
  }, []);

  useEffect(() => {
    if (!businesses.length) return;
    if (!activeId || !businesses.find((b) => b.id === activeId)) {
      setActiveId(businesses[0].id);
    }
  }, [businesses, activeId]);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeId) ?? null,
    [businesses, activeId],
  );

  function setActiveBusinessId(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <BusinessCtx.Provider
      value={{
        businesses,
        activeBusiness,
        setActiveBusinessId,
        loading: isLoading,
        refetch,
      }}
    >
      {children}
    </BusinessCtx.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessCtx);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
}
