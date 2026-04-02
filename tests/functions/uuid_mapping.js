export function licenseToKeyMapping(licenses) {
    const uuidMap = {};
    licenses.forEach((l) => {
        uuidMap[l.uuid] = l.signature_public_key;
    });
    return uuidMap;
}
