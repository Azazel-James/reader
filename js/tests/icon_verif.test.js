import { expect, describe, it } from "vitest";
import { iconVerif } from "./functions/icon_verif";

describe("Icon verification assignment", () => {
    describe("Valid arguments", () => {
        it("should assign a lock symbol to crypto and a crossmark to api", () => {
            const crypto = true;
            const api = false;

            const result = iconVerif(crypto, api);

            expect(result).toEqual("&#128274;" + "&#10060;");
        });

        it("should assign a crossmark to crypto and a checkmark to api", () => {
            const crypto = false;
            const api = true;

            const result = iconVerif(crypto, api);

            expect(result).toEqual("&#10060;" + "&#9989;");
        });

        it("should assign a crossmark to both", () => {
            const crypto = false;
            const api = false;

            const result = iconVerif(crypto, api);

            expect(result).toEqual("&#10060;" + "&#10060;");
        });

        it("should assign a lock and a checkmark", () => {
            const crypto = true;
            const api = true;

            const result = iconVerif(crypto, api);

            expect(result).toEqual("&#128274;" + "&#9989;");
        });
    });

    describe("Invalid arguments", () => {
        it("should return crossmarks (falsy arguments)", () => {
            const result = iconVerif();

            expect(result).toEqual("&#10060;" + "&#10060;");
        });

        it("should return lock for api (falsy argument + wrong order)", () => {
            const api = true;
            const result = iconVerif(api);

            expect(result).toEqual("&#128274;" + "&#10060;");
        });

        it("should return lock and checkmark (truthy arguments)", () => {
            const crypto = 12;
            const api = [];
            const result = iconVerif(crypto, api);

            expect(result).toEqual("&#128274;" + "&#9989;");
        });

        it("should return one lock one crossmark", () => {
            const crypto = [true, false, false];
            const result = iconVerif(crypto[0], crypto[1], crypto[3]);

            expect(result).toEqual("&#128274;" + "&#10060;");
        });
    });
});
