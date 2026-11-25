import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUsableYahooGuid, resolveManagerGuid } from "./manager-identity";

describe("isUsableYahooGuid", () => {
  it("rejects Yahoo privacy placeholders", () => {
    assert.equal(isUsableYahooGuid("--hidden--"), false);
    assert.equal(isUsableYahooGuid(""), false);
    assert.equal(isUsableYahooGuid("  "), false);
    assert.equal(isUsableYahooGuid(null), false);
    assert.equal(isUsableYahooGuid(undefined), false);
  });

  it("accepts a real Yahoo guid", () => {
    assert.equal(isUsableYahooGuid("WXB7YNB6HGFD6UZOSR3LKDIPXI"), true);
  });
});

describe("resolveManagerGuid", () => {
  const existingGuidByNickname = new Map([
    ["Noah", "WXB7YNB6HGFD6UZOSR3LKDIPXI"],
    ["Ghost", "--hidden--"],
  ]);

  it("uses the Yahoo guid when it is real", () => {
    assert.equal(
      resolveManagerGuid({
        yahooGuid: "ABC123",
        nickname: "Noah",
        teamKey: "470.l.817908.t.8",
        existingGuidByNickname,
      }),
      "ABC123",
    );
  });

  it("matches an existing manager by nickname when guid is hidden", () => {
    assert.equal(
      resolveManagerGuid({
        yahooGuid: "--hidden--",
        nickname: "Noah",
        teamKey: "470.l.817908.t.8",
        existingGuidByNickname,
      }),
      "WXB7YNB6HGFD6UZOSR3LKDIPXI",
    );
  });

  it("does not reuse another hidden guid via nickname", () => {
    assert.equal(
      resolveManagerGuid({
        yahooGuid: "--hidden--",
        nickname: "Ghost",
        teamKey: "470.l.817908.t.3",
        existingGuidByNickname,
      }),
      "hidden:470.l.817908.t.3",
    );
  });

  it("falls back to a unique synthetic guid per team", () => {
    assert.equal(
      resolveManagerGuid({
        yahooGuid: "--hidden--",
        nickname: "Ben",
        teamKey: "470.l.817908.t.3",
        existingGuidByNickname,
      }),
      "hidden:470.l.817908.t.3",
    );
  });
});
