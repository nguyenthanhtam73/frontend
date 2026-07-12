"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Toast } from "@/components/ui/toast";
import { useToastViewport, type ToastPosition } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Viewport anchor + horizontal alignment per position (mobile is full-width). */
const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right": "top-0 right-0 sm:items-end",
  "top-left": "top-0 left-0 sm:items-start",
  "top-center": "top-0 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-0 right-0 sm:items-end",
  "bottom-left": "bottom-0 left-0 sm:items-start",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 items-center",
};

/** Renders the live toast stack in a portal on <body>. Mount once inside
 *  <ToastProvider>. Newest toast always appears nearest the anchored edge. */
export function Toaster() {
  const { toasts, dismiss, pause, resume, position } = useToastViewport();
  const t = useTranslations("common");

  // Portals need the DOM; defer until mounted to avoid SSR/hydration issues.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isTop = position.startsWith("top");

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm",
        // Top-anchored: reverse so the newest toast sits at the top edge.
        isTop ? "flex-col-reverse" : "flex-col",
        POSITION_CLASSES[position],
      )}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          position={position}
          closeLabel={t("dismiss")}
          onClose={() => dismiss(toast.id)}
          onPause={() => pause(toast.id)}
          onResume={() => resume(toast.id)}
        />
      ))}
    </div>,
    document.body,
  );
}
