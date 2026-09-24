import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptNote, decryptNote } from "../lib/private-note";
const store = require("../lib/emaktab-store.cjs");
afterEach(() => vi.unstubAllEnvs());
describe("Private recovery delivery", () => {
  it("encrypts passwords with randomized authenticated ciphertext bound to the recipient", () => {
    vi.stubEnv("AUTH_SECRET", "test-only-encryption-secret-with-32-characters");
    const first = store.seal("temporary-test-value", "student-a:request-1");
    const second = store.seal("temporary-test-value", "student-a:request-1");
    expect(first).not.toContain("temporary-test-value");
    expect(first).not.toBe(second);
    expect(store.unseal(first, "student-a:request-1")).toBe(
      "temporary-test-value",
    );
    expect(() => store.unseal(first, "student-b:request-1")).toThrow();
    expect(() => store.unseal(first, "student-a:request-2")).toThrow();
  });
  it("never includes encrypted or clear passwords in summary metadata and expires deliveries", () => {
    const result = store.present({
      id: "r",
      status: "READY",
      expiresAt: "2020-01-01T00:00:00Z",
      envelope: "secret",
      password: "secret",
    });
    expect(result.status).toBe("EXPIRED");
    expect(result).not.toHaveProperty("envelope");
    expect(result).not.toHaveProperty("password");
  });
  it("rejects issuing by admins, owners, leaders and students before touching the database", async () => {
    for (const role of ["ADMIN", "OWNER", "LEADER", "STUDENT"]) {
      await expect(
        store.act({}, { role }, { action: "issue" }),
      ).rejects.toMatchObject({ status: 403 });
    }
  });
  it("fails closed when encryption is not configured", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => store.seal("temporary-test-value", "recipient")).toThrow();
  });
});
describe("Device-only private note", () => {
  it("requires the right code and owner, and does not store readable note contents", async () => {
    const note = await encryptNote(
      "my-private-test-note",
      "my-test-code",
      "student-a",
    );
    expect(note).not.toContain("my-private-test-note");
    expect(await decryptNote(note, "my-test-code", "student-a")).toBe(
      "my-private-test-note",
    );
    await expect(
      decryptNote(note, "wrong-code", "student-a"),
    ).rejects.toThrow();
    await expect(
      decryptNote(note, "my-test-code", "student-b"),
    ).rejects.toThrow();
  });
});
