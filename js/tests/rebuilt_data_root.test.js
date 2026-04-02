import { expect, describe, it } from "vitest";
import { rebuiltData } from "./functions/rebuilt_data_root";
import { row1, rowNaN } from "./functions/fixtures";

describe("rebuiltData", () => {
    it("should create an object with the metadata and sas_data with tableName = root", () => {
        const result = rebuiltData(row1);

        expect(result).toEqual({
            previous_signature: "valid_0",
            sas_data: "root",
            sas_data_type: "AA",
            sas_sequence_id: 0,
        });
    });
    it("should have s_s_id to NaN", () => {
        const result = rebuiltData(rowNaN);

        expect(result).toEqual({
            previous_signature: "valid_3",
            sas_data: "root",
            sas_data_type: "AA",
            sas_sequence_id: NaN,
        });
    });
});
