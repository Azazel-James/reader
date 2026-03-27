import { expect, describe, it } from "vitest";
import { iconVerif } from "./functions/icon_verif";

describe("verifyChain", () => {
    it("should assign a lock symbol to crypto and a crossmark to api", () => {
        const crypto = true;
        const api = false;

        const result = iconVerif(crypto, api);

        expect(result).toEqual("&#128274;" + "&#10060;");
    });
});
