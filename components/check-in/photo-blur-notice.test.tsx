import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { PhotoBlurNotice } from "./photo-blur-notice";

describe("PhotoBlurNotice", () => {
  it("renders the Vietnamese warning with retake and send-anyway actions", () => {
    const html = renderToStaticMarkup(
      <PhotoBlurNotice
        slot={0}
        message="Ảnh hơi mờ, bạn giữ máy yên và chụp lại nhé"
        retakeLabel="Chụp lại"
        sendAnywayLabel="Vẫn gửi ảnh này"
        onRetake={() => {}}
        onSendAnyway={() => {}}
      />,
    );
    assert.match(html, /Ảnh hơi mờ, bạn giữ máy yên và chụp lại nhé/);
    assert.match(html, /Chụp lại/);
    assert.match(html, /Vẫn gửi ảnh này/);
    assert.match(html, /data-testid="checkin-photo-blur-warning"/);
    assert.match(html, /data-testid="checkin-photo-blur-retake"/);
    assert.match(html, /data-testid="checkin-photo-blur-send"/);
    assert.match(html, /type="button"/);
    assert.equal(html.includes("blob:"), false);
  });
});
