export function genericExport() {
    // Gets the data from the selected table
    const columns = ["id", "sig", "name"];
    const rows = [
        ["abc", "sig_1", "A"],
        ["def", "sig_2", "B"],
    ];

    // Creates the csv content by joining collumns and rows, adds the necessary header for the csv file
    let csvContent =
        "data:text/csv;charset=utf-8," + columns.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");

    // Turns the csv content into an encoded URI
    const encodedUri = encodeURI(csvContent);

    // Sets the href to the encoded URI and download attribute file name to a default value for the export link/btn
    exportBtn.setAttribute("href", encodedUri);
    exportBtn.setAttribute("download", `${tableName}_table_export.csv`);
}
