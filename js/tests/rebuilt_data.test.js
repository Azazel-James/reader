import { expect, describe, it } from "vitest";
import { rebuiltData } from "./functions/rebuilt_data";

describe("rebuiltData", () => {
    it("create an object with the metadata and sas_data with tableName != root", () => {
        const input = {
            _id: "abc",
            _signature: "def",
            meta_sas_sequence_id: "12",
            meta_previous_signature: "abc",
            meta_sas_data_type: "ghij",
            name: "facture 12",
            doctype: "facture",
        };

        const result = rebuiltData(input);

        expect(result).toEqual({
            previous_signature: "abc",
            sas_data: { doctype: "facture", name: "facture 12" },
            sas_data_type: "ghij",
            sas_sequence_id: 12,
        });
    });
});
