export function rebuiltSasData(objRow) {
    const sas_data = {};
    const sortedKeys = Object.keys(objRow)
        .filter((key) => key !== "_id" && key !== "_signature" && !key.startsWith("meta_"))
        .sort();

    sortedKeys.forEach((key) => {
        sas_data[key] = objRow[key];
    });
    return sas_data;
}
