import { rebuiltSasData } from "./rebuilt_sas_data";
import { getMeta } from "./get_meta";

export function rebuiltData(objRow) {
    const { previous_signature, ...meta } = getMeta(objRow);
    const tableName = "facture";
    let sas_data = rebuiltSasData(objRow);
    if (tableName === "root") {
        sas_data = "root";
    }

    return {
        previous_signature: previous_signature,
        sas_data,
        ...meta,
    };
}
