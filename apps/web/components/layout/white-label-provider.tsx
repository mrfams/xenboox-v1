"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────

export interface BrandingConfig {
  isActive: boolean;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colorScheme: Record<string, string>;
  hideXenbooxBranding: boolean;
}

interface WhiteLabelContextType {
  branding: BrandingConfig | null;
  loading: boolean;
  isFirmTier: boolean;
  activeDomain: string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────

const WhiteLabelContext = createContext<WhiteLabelContextType>({
  branding: null,
  loading: false,
  isFirmTier: false,
  activeDomain: null,
});

export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [isFirmTier, setIsFirmTier] = useState(false);

  // Detect custom domain from hostname
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      setActiveDomain(hostname);
    }
  }, []);

  // Fetch branding config
  const { data: brandingData, isLoading } = trpc.branding.getConfig.useQuery(
    undefined,
    {
      retry: false,
      enabled: isFirmTier, // Only fetch if firm tier
    },
  );

  // Check if org is Firm tier
  const { data: checkResult } = trpc.branding.checkAccess.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (checkResult) {
      setIsFirmTier(checkResult.allowed);
    }
  }, [checkResult]);

  useEffect(() => {
    if (brandingData) {
      setBranding({
        ...brandingData,
        colorScheme: brandingData.colorScheme ?? ({} as Record<string, string>),
      });
    }
  }, [brandingData]);

  // Apply CSS custom properties for white-label color scheme
  useEffect(() => {
    if (branding?.isActive && branding.colorScheme) {
      const root = document.documentElement;
      const cs = branding.colorScheme;
      if (cs.primary) root.style.setProperty("--wl-primary", cs.primary);
      if (cs.primaryForeground)
        root.style.setProperty("--wl-primary-foreground", cs.primaryForeground);
      if (cs.accent) root.style.setProperty("--wl-accent", cs.accent);
      if (cs.accentForeground)
        root.style.setProperty("--wl-accent-foreground", cs.accentForeground);
      if (cs.destructive)
        root.style.setProperty("--wl-destructive", cs.destructive);
      if (cs.muted) root.style.setProperty("--wl-muted", cs.muted);
      if (cs.border) root.style.setProperty("--wl-border", cs.border);
    }
  }, [branding]);

  return (
    <WhiteLabelContext.Provider
      value={{
        branding,
        loading: isLoading,
        isFirmTier,
        activeDomain,
      }}
    >
      {children}
    </WhiteLabelContext.Provider>
  );
}
