"use client";

import { Camera, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Segmented control: photo capture vs no-photo (tag + notes) mode. */
export function CaptureModeToggle({
  skipMode,
  photoLabel,
  skipLabel,
  onSelectPhoto,
  onSelectSkip,
  disabled,
}: {
  skipMode: boolean;
  photoLabel: string;
  skipLabel: string;
  onSelectPhoto: () => void;
  onSelectSkip: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={photoLabel}
      className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1"
    >
      <ModeTab
        active={!skipMode}
        disabled={disabled}
        icon={<Camera className="size-4 shrink-0" aria-hidden />}
        label={photoLabel}
        onClick={onSelectPhoto}
      />
      <ModeTab
        active={skipMode}
        disabled={disabled}
        icon={<ImageOff className="size-4 shrink-0" aria-hidden />}
        label={skipLabel}
        onClick={onSelectSkip}
      />
    </div>
  );
}

function ModeTab({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition-all duration-200 sm:min-h-10 sm:text-sm",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
