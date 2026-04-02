import { describe, it, expect } from "vitest";
import { getLicenses } from "./functions/get_licenses";
import { pairingSig } from "./functions/pairing_sig";
import JSZip from "jszip";

describe("getLicenses", () => {
    it("should filter licenses from other files", async () => {
        const jzip = new JSZip();

        jzip.file("doc1.sqlite", "content1");
        jzip.file("doc1.sqlite.sig", "signature1");
        jzip.file("archive/licenses/doc3.json", JSON.stringify({ version: "1", signature_algorithm: "ed25519" }));
        const zipBlob = await jzip.generateAsync({ type: "blob" });

        const sigPairs = await pairingSig(zipBlob);

        const result = await getLicenses(sigPairs);

        expect(result).toBeDefined();
        expect(result).toBeTypeOf("object");
        expect(result[0]).toEqual({ version: "1", signature_algorithm: "ed25519" });
    });

    it("should return an empty array", async () => {
        const jzip = new JSZip();

        jzip.file("doc1.sqlite", "content1");
        jzip.file("doc1.sqlite.sig", "signature1");
        jzip.file("doc3.json", JSON.stringify({ version: "1", signature_algorithm: "ed25519" }));
        const zipBlob = await jzip.generateAsync({ type: "blob" });

        const sigPairs = await pairingSig(zipBlob);
        const result = await getLicenses(sigPairs);

        expect(result).toBeDefined();
        expect(result).toBeTypeOf("object");
        expect(result[0]).toBeUndefined();
    });

    it("should return an error", async () => {
        await expect(getLicenses()).rejects.toThrow();
    });
});
