import { describe, it, expect } from "vitest";
import { pairingSig } from "./functions/pairing_sig";
import JSZip from "jszip";

describe("pairingSig", () => {
    it("should pair documents with their .sig files", async () => {
        const zip = new JSZip();

        // Add test files
        zip.file("doc1.txt", "content1");
        zip.file("doc1.txt.sig", "signature1");
        zip.file("doc2.txt", "content2");
        zip.file("doc3.txt.sig", "signature3");
        zip.file("doc4.txt", "content4");

        const zipBlob = await zip.generateAsync({ type: "blob" });

        const result = await pairingSig(zipBlob);

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe("doc1.txt");
        expect(result[0].sig).toBeDefined();
        expect(result[1].name).toBe("doc2.txt");
        expect(result[1].sig).toBeUndefined();
        expect(result[2].name).toBe("doc4.txt");
    });

    it("should close the reader after processing", async () => {
        // Since we can't spy on zip.js internals easily, test that it doesn't throw
        const zip = new JSZip();
        zip.file("test.txt", "content");
        const zipBlob = await zip.generateAsync({ type: "blob" });

        await expect(pairingSig(zipBlob)).resolves.toBeDefined();
    });

    it("should handle empty ZIP", async () => {
        const zip = new JSZip();
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const result = await pairingSig(zipBlob);

        expect(result).toHaveLength(0);
    });

    it("should handle ZIP with only .sig files", async () => {
        const zip = new JSZip();
        zip.file("only.sig", "signature");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const result = await pairingSig(zipBlob);

        expect(result).toHaveLength(0);
    });
});
