import { expect, describe, it } from "vitest";
import { getMeta } from "./functions/get_meta";

describe("getMeta", () => {
    it("should keep keys starting by meta_*, sort them, erase meta_ from the key name, make sas sequence id a number", () => {
        const input = {
            _id: "abc",
            _signature: "def",
            meta_sas_sequence_id: "12",
            meta_previous_signature: "abc",
            meta_sas_data_type: "ghij",
            name: "facture 12",
            doctype: "facture",
        };
        const result = getMeta(input);

        expect(result).toEqual({ previous_signature: "abc", sas_data_type: "ghij", sas_sequence_id: 12 });
    });
});
