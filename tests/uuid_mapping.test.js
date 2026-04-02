import { describe, it, expect } from "vitest";
import { licenseToKeyMapping } from "./functions/uuid_mapping";

describe("licenseToKeyMapping", () => {
    it("should return an object with id and matching public key", () => {
        const license = [
            {
                uuid: "AAA",
                signature_private_key: "def",
                signature_public_key: "abc",
            },
        ];

        const result = licenseToKeyMapping(license);

        expect(result).toEqual({ AAA: "abc" });
    });
});
