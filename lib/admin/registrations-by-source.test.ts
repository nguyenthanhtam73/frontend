import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { registrationsBySourcePath } from "@/lib/api/admin-registrations";

import {
  defaultRegistrationsSince,
  isIsoDate,
  registrationDayTotal,
  registrationDaysNewestFirst,
  shiftIsoDate,
  vietnamCivilNoon,
} from "./registrations-by-source";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("admin registrations-by-source", () => {
  it("defaults since to seven Vietnam days ago", () => {
    // 2026-10-30 16:00 UTC = 2026-10-30 23:00 in Asia/Ho_Chi_Minh
    assert.equal(defaultRegistrationsSince(new Date("2026-10-30T16:00:00.000Z")), "2026-10-23");
    // 2026-10-30 17:30 UTC = 2026-10-31 00:30 in Asia/Ho_Chi_Minh
    assert.equal(defaultRegistrationsSince(new Date("2026-10-30T17:30:00.000Z")), "2026-10-24");
  });

  it("shifts civil dates across month boundaries", () => {
    assert.equal(shiftIsoDate("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftIsoDate("2024-03-01", -1), "2024-02-29");
    assert.equal(isIsoDate("2026-10-23"), true);
    assert.equal(isIsoDate("2026-02-31"), false);
    assert.equal(isIsoDate(""), false);
    assert.throws(() => shiftIsoDate("yesterday", -7), /invalid_since/);
  });

  it("sums one day's buckets and keeps zero days at zero", () => {
    assert.equal(
      registrationDayTotal({ tiktok: 3, facebook: 2, other: 1, none: 1 }),
      7,
    );
    assert.equal(
      registrationDayTotal({ tiktok: 0, facebook: 0, other: 0, none: 0 }),
      0,
    );
  });

  it("lists days newest first without mutating the API array", () => {
    const days = [
      { date: "2026-10-23", tiktok: 1, facebook: 0, other: 0, none: 2 },
      { date: "2026-10-25", tiktok: 0, facebook: 4, other: 0, none: 0 },
      { date: "2026-10-24", tiktok: 0, facebook: 0, other: 1, none: 0 },
    ];
    assert.deepEqual(
      registrationDaysNewestFirst(days).map((day) => day.date),
      ["2026-10-25", "2026-10-24", "2026-10-23"],
    );
    assert.equal(days[0]!.date, "2026-10-23");
  });

  it("formats a civil date as that Vietnam day", () => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(vietnamCivilNoon("2026-10-23"));
    assert.equal(formatted, "2026-10-23");
  });

  it("calls the admin counts endpoint with since and the Vietnam zone", () => {
    assert.equal(
      registrationsBySourcePath("2026-10-23"),
      "/api/v1/admin/stats/registrations-by-source?since=2026-10-23&tz=Asia%2FHo_Chi_Minh",
    );
  });

  it("keeps the funnel table behind the admin gate and shows counts only", () => {
    const view = fs.readFileSync(
      path.join(root, "components/admin/funnel-admin-view.tsx"),
      "utf8",
    );
    assert.match(view, /fetchAdminRegistrationsBySource\(since\)/);
    assert.match(
      view,
      /enabled: !authPending && hasAuth && isAdmin && isIsoDate\(since\)/,
    );
    assert.equal(view.includes("email"), false);
    assert.equal(view.includes("user_id"), false);
    assert.equal(view.includes("utm_"), false);
    assert.equal(view.includes("fbclid"), false);
    assert.equal(view.includes("ttclid"), false);

    const vi = JSON.parse(fs.readFileSync(path.join(root, "messages/vi.json"), "utf8")) as {
      adminFunnel: { sources: Record<string, string> };
    };
    const en = JSON.parse(fs.readFileSync(path.join(root, "messages/en.json"), "utf8")) as {
      adminFunnel: { sources: Record<string, string> };
    };
    assert.deepEqual(Object.keys(vi.adminFunnel.sources).sort(), Object.keys(en.adminFunnel.sources).sort());
    assert.equal(vi.adminFunnel.sources.title, "Đăng ký theo nguồn");
    assert.equal(vi.adminFunnel.sources.colDate, "Ngày");
    assert.equal(vi.adminFunnel.sources.colTiktok, "TikTok");
    assert.equal(vi.adminFunnel.sources.colFacebook, "Facebook");
    assert.equal(vi.adminFunnel.sources.colOther, "Nguồn khác");
    assert.equal(vi.adminFunnel.sources.colNone, "Không rõ");
    assert.equal(vi.adminFunnel.sources.colTotal, "Tổng");
  });
});
