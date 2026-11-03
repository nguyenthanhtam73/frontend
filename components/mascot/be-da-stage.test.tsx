import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaStage } from "@/components/mascot/be-da-stage";
import { defaultSnapshot, resolveBeDaView, type BeDaView } from "@/lib/mascot/model";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

function viewFor(): BeDaView {
  return resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      mood: "waiting_door_sign",
      missedDays: 21,
      isDefault: false,
      glowProgress: 0.08,
    },
    missedDays: 21,
    sessionHappy: false,
    locale: "vi",
  });
}

function renderStage(line: string, messages: typeof vi = vi, locale = "vi") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <BeDaStage view={viewFor()} line={line} locale={locale} />
    </NextIntlClientProvider>,
  );
}

function bubbleTag(html: string): string {
  return html.match(/<p\b[^>]*data-testid="be-da-line"[^>]*>/)?.[0] ?? "";
}

describe("Bé Da speech bubble", () => {
  it("shows the given line in dark ink on the white bubble", () => {
    const html = renderStage("Tôi đã bị bỏ rơi ở đây");
    const bubble = bubbleTag(html);
    assert.match(bubble, /text-rose-950/);
    assert.equal(/\btext-foreground\b/.test(bubble), false);
    assert.match(html, /Tôi đã bị bỏ rơi ở đây/);
    assert.equal(html.includes("Da ổn mà, chăm tiếp nha"), false);
    assert.match(html, /w-\[148px\]/);
    assert.match(html, /data-testid="be-da-glow-progress"/);
  });

  it("uses the normal line when the bubble text is blank", () => {
    const html = renderStage("   ");
    assert.match(html, /Da ổn mà, chăm tiếp nha/);
    assert.match(bubbleTag(html), /text-rose-950/);
  });

  it("uses the English fallback for a blank line", () => {
    const html = renderStage("", en, "en");
    assert.match(html, /Skin(?:&#x27;|')s okay, keep going/);
  });

  it("hides the bubble when the line and the fallback are both blank", () => {
    const messages = structuredClone(vi);
    messages.mascot.lines.normal = " ";
    const html = renderStage("", messages);
    assert.equal(html.includes('data-testid="be-da-line"'), false);
    assert.equal(html.includes("bg-white/85"), false);
    assert.match(html, /data-testid="be-da-stage"/);
  });
});
