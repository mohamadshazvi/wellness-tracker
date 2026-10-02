import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "./wellness.ts";

describe("actionable sign-in errors", () => {
  const cases = [
    ["auth/unauthorized-domain", /authorized domains/],
    ["auth/operation-not-allowed", /not enabled/],
    ["auth/popup-blocked", /Allow popups/],
    ["auth/popup-closed-by-user", /cancelled/],
    ["auth/cancelled-popup-request", /cancelled/],
    ["auth/account-exists-with-different-credential", /originally used/],
    ["auth/network-request-failed", /connection/],
    ["auth/too-many-requests", /wait/],
    ["auth/invalid-oauth-client-id", /provider configuration/],
    ["auth/invalid-oauth-provider", /provider configuration/],
  ] as const;
  for (const [code, expected] of cases) {
    test(code, () => assert.match(authErrorMessage({ code }), expected));
  }

  test("keeps email/password error guidance", () => {
    assert.match(authErrorMessage({ code: "auth/invalid-credential" }, "signin"), /email or password/);
    assert.match(authErrorMessage({ code: "auth/email-already-in-use" }, "signup"), /Sign in instead/);
  });

  test("does not expose raw provider errors", () => {
    assert.equal(authErrorMessage({ code: "unknown", message: "secret" }), "Authentication failed. Please try again.");
  });
});
