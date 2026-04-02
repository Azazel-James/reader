import { expect, describe, it } from "vitest";
import { rebuiltData } from "./functions/rebuilt_data";
import { row1 } from "./functions/fixtures";

describe("rebuiltData", () => {
    it("should create an object with the metadata and sas_data for tableName != root", () => {
        const result = rebuiltData(row1);

        expect(result).toEqual({
            previous_signature: "valid_0",
            sas_data: { doctype: "AAA", name: "A" },
            sas_data_type: "AA",
            sas_sequence_id: 0,
        });
    });
});
