"use client";

import { useEffect, useRef } from "react";

import { useNavigationBlockStore } from "@/lib/stores/navigation-block-store";

/**
 * Register an in-app navigation guard (e.g. routine dirty state).
 * Pair with {@link NavigationBlockListener} in the app shell.
 */
export function useNavigationBlock(opts: {
  id: string;
  active: boolean;
  message: string;
}) {
  const register = useNavigationBlockStore((s) => s.register);
  const unregister = useNavigationBlockStore((s) => s.unregister);

  const activeRef = useRef(opts.active);
  activeRef.current = opts.active;

  const messageRef = useRef(opts.message);
  messageRef.current = opts.message;

  useEffect(() => {
    register({
      id: opts.id,
      isActive: () => activeRef.current,
      getMessage: () => messageRef.current,
    });
    return () => unregister(opts.id);
  }, [opts.id, register, unregister]);
}
