import { expect, describe, it } from "vitest";

describe("turning data into exportable csv", () => {
    it("should make a nice text file", () => {
        const columns = ["id", "sig", "name"];
        const rows = [
            ["abc", "sig_1", "A"],
            ["def", "sig_2", "B"],
        ];

        // Creates the csv content by joining collumns and rows, adds the necessary header for the csv file
        let csvContent =
            "data:text/csv;charset=utf-8," + columns.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);

        expect(encodedUri).toBeDefined();
        expect(csvContent).toEqual(
            "data:text/csv;charset=utf-8,id,sig,name" + "\n" + "abc,sig_1,A" + "\n" + "def,sig_2,B"
        );
    });

    it("should throw an error as columns and rows are not arrays", () => {
        const columns = { columns: ["id", "sig", "name"] };
        const rows = {
            rows: [
                ["abc", "sig_1", "A"],
                ["def", "sig_2", "B"],
            ],
        };
        let csvContent;
        expect(() => {
            csvContent =
                "data:text/csv;charset=utf-8," + columns.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");
        }).toThrow(TypeError);

        const encodedUri = encodeURI(csvContent);

        expect(csvContent).toBeUndefined();
        expect(encodedUri).toEqual("undefined");
    });
});
