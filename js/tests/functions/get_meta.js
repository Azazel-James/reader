export function getMeta(objRow) {
    const meta = {};
    const sortedKeys = Object.keys(objRow)
        .filter((key) => key.startsWith("meta_"))
        .sort();

    sortedKeys.forEach((key) => {
        const cleanKey = key.slice(5); // More efficient than replace
        meta[cleanKey] = cleanKey === "sas_sequence_id" ? +objRow[key] : objRow[key];
    });
    return meta;
}
