import { expect, describe, it } from "vitest";
import { getMeta } from "./functions/get_meta";
import { row1, row3 } from "./functions/fixtures";

describe("getMeta", () => {
    it("should keep keys starting by meta_*, sort them, erase meta_ from the key name, make sas sequence id a number", () => {
        const result = getMeta(row1);

        expect(result).toEqual({ previous_signature: "valid_0", sas_data_type: "AA", sas_sequence_id: 0 });
    });

    it("should be empty", () => {
        const result = getMeta(row3);

        expect(result).toBeDefined();
        expect(result).toEqual({});
    });
});
