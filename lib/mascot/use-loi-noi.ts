"use client";

import { useEffect, useState } from "react";

import { maybeShowOpenLine, shownLoiText, subscribeLoi } from "@/lib/mascot/loi-noi";

/** The line Bé Da is saying right now, or null once the few seconds are up. */
export function useLoiText(): string | null {
  const [, bump] = useState(0);
  useEffect(() => subscribeLoi(() => bump((n) => n + 1)), []);
  return shownLoiText();
}

export function useOpenLoiLine(input: { ready: boolean; missedDays: number | null; streak: number | null }): void {
  useEffect(() => {
    if (!input.ready) return;
    maybeShowOpenLine({ missedDays: input.missedDays, streak: input.streak });
  }, [input.ready, input.missedDays, input.streak]);
}
