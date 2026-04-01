import { expect, describe, it } from "vitest";
import { rebuiltSasData } from "./functions/rebuilt_sas_data";

describe("rebuiltSasData", () => {
    it("should ignore _id, _signature, meta_* and sort the keys", () => {
        const input = {
            _id: "abc",
            _signature: "def",
            articles: [{ prix: "50", libelle: "A" }],
            meta_sas_sequence_id: "12",
            meta_previous_signature: "abc",
            name: "facture 12",
            doctype: "facture",
        };
        const result = rebuiltSasData(input);

        expect(result).toEqual({ articles: [{ libelle: "A", prix: "50" }], doctype: "facture", name: "facture 12" });
    });

    it("should throw a type error, input is not an object", () => {
        const input = [
            {
                _id: "abc",
                _signature: "def",
                meta_sas_sequence_id: "12",
                meta_previous_signature: "abc",
                name: "facture 12",
                doctype: "facture",
            },
            {
                _id: "ghi",
                _signature: "jkl",
                meta_sas_sequence_id: "13",
                meta_previous_signature: "def",
                name: "facture 13",
                doctype: "facture",
            },
        ];
        const result = rebuiltSasData(input);

        expect(result).toThrow(TypeError);
    });
});
