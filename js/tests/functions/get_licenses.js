export async function getLicenses(sigPair) {
    const licenses = [];

    for (const pair of sigPair) {
        if (pair.name.startsWith("archive/licenses/")) {
            const text = await pair.doc.text();
            const parsed = JSON.parse(text);
            licenses.push(parsed);
        }
    }

    return licenses;
}
