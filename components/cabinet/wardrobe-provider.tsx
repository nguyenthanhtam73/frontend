"use client";

import { createContext, useContext } from "react";

import { useWardrobeQuery } from "@/lib/hooks/use-wardrobe";

type WardrobeContextValue = ReturnType<typeof useWardrobeQuery>;

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

/** Shares one TanStack Query instance for list + form on the cabinet page. */
export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const value = useWardrobeQuery();
  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeContextValue {
  const ctx = useContext(WardrobeContext);
  if (!ctx) {
    throw new Error("useWardrobe must be used within WardrobeProvider");
  }
  return ctx;
}
