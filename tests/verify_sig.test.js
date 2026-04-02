import { describe, it, expect, vi, afterEach } from "vitest";
import { verifySig } from "./functions/verify_sig";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("mock signature verification", () => {
    it("should validate signature", async () => {
        vi.spyOn(globalThis.crypto.subtle, "verify").mockResolvedValue(true);

        const result = await verifySig("pem", "sig", "data");

        expect(result).toBe(true);
    });

    it("should not validate signature", async () => {
        vi.spyOn(globalThis.crypto.subtle, "verify").mockResolvedValue(false);

        const result = await verifySig("pem", "wrong_sig", "data");

        expect(result).toBe(false);
    });
});
