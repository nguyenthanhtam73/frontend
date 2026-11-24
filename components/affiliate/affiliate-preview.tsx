"use client";

import { AffiliateSuggestionSection } from "@/components/affiliate/affiliate-suggestions";
import { Card, CardContent } from "@/components/ui/card";
import type { AffiliateMatchInput } from "@/lib/affiliate/types";

const DAY = "2026-11-24";

const OILY: AffiliateMatchInput = {
  userId: "preview-oily",
  dayKey: DAY,
  skinTypes: ["oily"],
  concerns: ["acne", "oil"],
  ownedSteps: [],
  severe: false,
  cabinetKnown: true,
};

const DRY: AffiliateMatchInput = {
  userId: "preview-dry",
  dayKey: DAY,
  skinTypes: ["dry"],
  concerns: ["dryness", "hydration"],
  ownedSteps: [],
  severe: false,
  cabinetKnown: true,
};

const SEVERE: AffiliateMatchInput = {
  ...OILY,
  userId: "preview-severe",
  severe: true,
};

const CABINET: AffiliateMatchInput = {
  ...OILY,
  userId: "preview-cabinet",
  ownedSteps: ["cleanser"],
};

export function AffiliatePreview({ caseId }: { caseId: string }) {
  if (caseId === "cabinet") {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4" data-affiliate-preview="cabinet">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Chăm da</p>
          <h1 className="text-2xl font-semibold tracking-tight">Tủ đồ chăm da</h1>
        </div>
        <Card>
          <CardContent className="space-y-1 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Đã có trong tủ</p>
            <p className="text-sm font-medium">CeraVe Foaming Cleanser</p>
            <p className="text-xs text-muted-foreground">Sữa rửa mặt</p>
          </CardContent>
        </Card>
        <AffiliateSuggestionSection input={CABINET} />
      </div>
    );
  }

  const input = caseId === "dry" ? DRY : caseId === "severe" ? SEVERE : OILY;
  const summary =
    caseId === "dry"
      ? "Hôm nay da khô, má hơi căng sau khi rửa. Chưa thấy dấu hiệu cần đi khám."
      : caseId === "severe"
        ? "Vùng má đau và sưng. Nên gặp bác sĩ da liễu vì da đau và sưng."
        : "Hôm nay da đổ dầu ở vùng chữ T và có vài nốt mụn. Không phải trường hợp cần đi khám.";

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4" data-affiliate-preview={caseId === "dry" || caseId === "severe" ? caseId : "oily"}>
      <Card>
        <CardContent className="space-y-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hôm nay da bạn</p>
          <p className="text-sm leading-relaxed">{summary}</p>
        </CardContent>
      </Card>
      <AffiliateSuggestionSection input={input} />
    </div>
  );
}
