import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

import { AnalysisMaintenanceNote } from "./analysis-maintenance-note";

function renderNote(locale: "vi" | "en") {
  const messages = locale === "vi" ? vi : en;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <AnalysisMaintenanceNote />
    </NextIntlClientProvider>,
  );
}

describe("AnalysisMaintenanceNote", () => {
  it("uses the Vietnamese maintenance copy", () => {
    const html = renderNote("vi");
    assert.match(html, /Hệ thống đang bảo trì/);
    assert.match(
      html,
      /Ảnh của bạn đã được lưu an toàn\. Kết quả sẽ có sau ít phút, bạn quay lại xem nhé\./,
    );
    assert.match(html, /data-testid="analysis-maintenance-note"/);
    assert.equal(html.includes("role=\"alert\""), false);
  });

  it("uses the English copy on /en", () => {
    const html = renderNote("en");
    assert.match(html, /The system is under maintenance/);
    assert.match(
      html,
      /Your photo has been saved safely\. The result will be ready in a few minutes — come back and take a look\./,
    );
  });
});
