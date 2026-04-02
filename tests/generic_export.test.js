import { expect, describe, it } from "vitest";
import { columns, rows, columnsobj, rowsobj } from "./functions/fixtures";

describe("turning data into exportable csv", () => {
    it("should make a structured text file", () => {
        // Creates the csv content by joining columns and rows, adds the necessary header for the csv file
        let csvContent =
            "data:text/csv;charset=utf-8," + columns.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);

        expect(encodedUri).toBeDefined();
        expect(csvContent).toEqual(
            "data:text/csv;charset=utf-8,id,sig,name" + "\n" + "abc,sig_1,A" + "\n" + "def,sig_2,B"
        );
    });

    it("should throw an error as columns and rows are not arrays", () => {
        let csvContent;
        expect(() => {
            csvContent =
                "data:text/csv;charset=utf-8," +
                columnsobj.join(",") +
                "\n" +
                rowsobj.map((e) => e.join(",")).join("\n");
        }).toThrow(TypeError);

        const encodedUri = encodeURI(csvContent);

        expect(csvContent).toBeUndefined();
        expect(encodedUri).toEqual("undefined");
    });
});
