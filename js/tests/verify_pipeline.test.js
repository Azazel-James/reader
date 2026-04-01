import { describe, it, expect, vi, afterEach } from "vitest";
import { verifySig } from "./functions/verify_sig";
import { row1, row2, rowHuhoh } from "./functions/fixtures";
import { verifyChain } from "./functions/verify_chain";
import { rebuiltRecord } from "./functions/rebuilt_record";

afterEach(() => {
    vi.restoreAllMocks();
});

function mockCrypto() {
    vi.spyOn(globalThis.crypto.subtle, "verify").mockImplementation((algo, key, signature, data) => {
        if (signature.startsWith("valid")) {
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    });
}

describe("mock verification pipeline", () => {
    it("should validate signature and chain", async () => {
        mockCrypto();

        const rows = [row1, row2];
        const processed = rows.map(rebuiltRecord);

        processed.sort((a, b) => a.data.sas_sequence_id - b.data.sas_sequence_id);

        const vSig = await Promise.all(processed.map((row) => verifySig(null, row.signature, new Uint8Array())));

        const vChain = verifyChain(processed);

        expect(vSig.every(Boolean)).toBe(true);
        expect(vChain).toBe(true);
    });

    it("should validate chain but not signature", async () => {
        mockCrypto();

        const rows = [row2, row1, rowHuhoh];
        const processed = rows.map(rebuiltRecord);

        const vSig = await Promise.all(processed.map((row) => verifySig(null, row.signature, new Uint8Array())));

        const vChain = verifyChain(processed);

        expect(vSig).includes(false);
        expect(vChain).toBe(true);
    });

    it("should not validate chain (broken) nor signature (invalid)", async () => {
        mockCrypto();

        const rows = [row1, rowHuhoh];
        const processed = rows.map(rebuiltRecord);

        processed.sort((a, b) => a.data.sas_sequence_id - b.data.sas_sequence_id);

        const vSig = await Promise.all(processed.map((row) => verifySig(null, row.signature, new Uint8Array())));

        const vChain = verifyChain(processed);

        expect(vSig).includes(false);
        expect(vChain).toBe(false);
    });
});
