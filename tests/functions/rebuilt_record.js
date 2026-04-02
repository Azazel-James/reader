import { rebuiltData } from "./rebuilt_data";

export function rebuiltRecord(objRow) {
    return {
        data: rebuiltData(objRow),
        signature: objRow._signature,
    };
}
