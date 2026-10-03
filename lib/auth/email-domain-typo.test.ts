import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { suggestEmailDomain } from "./email-domain-typo";

describe("suggestEmailDomain", () => {
  it("corrects small typos of providers used in Vietnam", () => {
    const cases: Array<[string, string]> = [
      ["gmal.com", "gmail.com"],
      ["gmial.com", "gmail.com"],
      ["gmail.co", "gmail.com"],
      ["gmail.con", "gmail.com"],
      ["gamil.com", "gmail.com"],
      ["gnail.com", "gmail.com"],
      ["gmai.com", "gmail.com"],
      ["gmail.cmo", "gmail.com"],
      ["gmal.con", "gmail.com"],
      ["yaho.com", "yahoo.com"],
      ["yahoo.co", "yahoo.com"],
      ["yahoo.con", "yahoo.com"],
      ["yhaoo.com", "yahoo.com"],
      ["yaho.com.vn", "yahoo.com.vn"],
      ["yahoo.co.vn", "yahoo.com.vn"],
      ["yahoo.con.vn", "yahoo.com.vn"],
      ["yahoo.com.nv", "yahoo.com.vn"],
      ["yahoo.cm.vn", "yahoo.com.vn"],
      ["yahocom.vn", "yahoo.com.vn"],
      ["hotmal.com", "hotmail.com"],
      ["hotmial.com", "hotmail.com"],
      ["hotmail.co", "hotmail.com"],
      ["hotmail.con", "hotmail.com"],
      ["outlok.com", "outlook.com"],
      ["outloo.com", "outlook.com"],
      ["outlook.co", "outlook.com"],
      ["outlook.con", "outlook.com"],
      ["outloko.com", "outlook.com"],
      ["icoud.com", "icloud.com"],
      ["icloud.co", "icloud.com"],
      ["icloud.con", "icloud.com"],
      ["icluod.com", "icloud.com"],
      ["gmail.com.vn", "gmail.com"],
      ["gmail.vn", "gmail.com"],
    ];

    for (const [typo, expected] of cases) {
      assert.equal(suggestEmailDomain(`ten@${typo}`), `ten@${expected}`, typo);
    }
  });

  it("keeps the local part as typed and lowercases only the domain", () => {
    assert.equal(suggestEmailDomain("  Ten.A+tag@GMal.COM  "), "Ten.A+tag@gmail.com");
    assert.equal(suggestEmailDomain("nguyễn@gmial.com"), "nguyễn@gmail.com");
  });

  it("does not suggest when the domain already matches a provider", () => {
    for (const domain of [
      "gmail.com",
      "yahoo.com",
      "yahoo.com.vn",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
    ]) {
      assert.equal(suggestEmailDomain(`ten@${domain}`), null, domain);
      assert.equal(suggestEmailDomain(`Ten@${domain.toUpperCase()}`), null, domain);
    }
  });

  it("does not correct real country domains or cloud.com", () => {
    for (const domain of [
      "yahoo.com.au",
      "yahoo.com.sg",
      "yahoo.com.ph",
      "yahoo.com.tw",
      "yahoo.com.my",
      "yahoo.ca",
      "hotmail.ca",
      "cloud.com",
    ]) {
      assert.equal(suggestEmailDomain(`ten@${domain}`), null, domain);
    }
  });

  it("does not suggest unrelated or other real domains", () => {
    const domains = [
      "example.com",
      "example.org",
      "dadiary.vn",
      "facebook.com",
      "google.com",
      "googlemail.com",
      "mail.com",
      "email.com",
      "ymail.com",
      "rocketmail.com",
      "yahoo.co.uk",
      "yahoo.co.jp",
      "yahoo.vn",
      "hotmail.co.uk",
      "outlook.co.uk",
      "live.com",
      "live.com.vn",
      "msn.com",
      "me.com",
      "mac.com",
      "aol.com",
      "aim.com",
      "gmx.com",
      "gmx.net",
      "proton.me",
      "protonmail.com",
      "pm.me",
      "zoho.com",
      "fastmail.com",
      "hey.com",
      "inbox.com",
      "mail.ru",
      "yandex.com",
      "yandex.ru",
      "qq.com",
      "naver.com",
      "apple.com",
      "microsoft.com",
      "fpt.com.vn",
      "vnpt.vn",
      "company.com",
      "company.com.vn",
      "games.com",
      "gmail.org",
      "gmail.net",
      "sub.gmail.com",
      "mail.google.com",
    ];

    for (const domain of domains) {
      assert.equal(suggestEmailDomain(`ten@${domain}`), null, domain);
    }
  });

  it("ignores addresses that fail the existing format check", () => {
    assert.equal(suggestEmailDomain(""), null);
    assert.equal(suggestEmailDomain("   "), null);
    assert.equal(suggestEmailDomain("ten"), null);
    assert.equal(suggestEmailDomain("ten@gmail"), null);
    assert.equal(suggestEmailDomain("ten@gmailcom"), null);
    assert.equal(suggestEmailDomain("ten@gmal"), null);
    assert.equal(suggestEmailDomain("ten@yahoo.com.v"), null);
    assert.equal(suggestEmailDomain("@gmal.com"), null);
    assert.equal(suggestEmailDomain("ten@@gmal.com"), null);
    assert.equal(suggestEmailDomain("ten @gmal.com"), null);
  });

  it("does not correct mistakes past two edits", () => {
    assert.equal(suggestEmailDomain("ten@gmial.co"), null);
    assert.equal(suggestEmailDomain("ten@not-a-provider.vn"), null);
  });
});
