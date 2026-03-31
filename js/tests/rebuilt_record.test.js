import { expect, describe, it } from "vitest";
import { rebuiltRecord } from "./functions/rebuilt_record";

describe("rebuiltRecord", () => {
    it("should create an object with data and signature", () => {
        const input = {
            _id: "abc",
            _signature: "def",
            meta_sas_sequence_id: "12",
            meta_previous_signature: "abc",
            meta_sas_data_type: "ghij",
            name: "facture 12",
            doctype: "facture",
        };

        const result = rebuiltRecord(input);

        expect(result)
            .toBeTypeOf("object")
            .toEqual({
                data: {
                    previous_signature: "abc",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 12",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 12,
                },
                signature: "def",
            });
    });
});
