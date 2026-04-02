import { expect, describe, it } from "vitest";
import { rebuiltRecord } from "./functions/rebuilt_record";
import { row1 } from "./functions/fixtures";

describe("rebuiltRecord", () => {
    it("should create an object with data and signature", () => {
        const result = rebuiltRecord(row1);

        expect(result)
            .toBeTypeOf("object")
            .toEqual({
                data: {
                    previous_signature: "valid_0",
                    sas_data: {
                        doctype: "AAA",
                        name: "A",
                    },
                    sas_data_type: "AA",
                    sas_sequence_id: 0,
                },
                signature: "valid_1",
            });
    });
});
