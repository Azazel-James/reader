const zip = require("@zip.js/zip.js");

export async function pairingSig(zipFile) {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
    const entries = await reader.getEntries();

    const sigMap = new Map();
    const sigPairs = [];

    // First pass: identify all signature files
    entries.forEach((entry) => {
        if (entry.filename.endsWith(".sig")) {
            sigMap.set(entry.filename.slice(0, -4), entry); // Store without .sig
        }
    });

    // Second pass: process non-sig files
    for (const entry of entries) {
        if (!entry.filename.endsWith(".sig")) {
            const pair = { doc: await entry.getData(new zip.BlobWriter()), name: entry.filename };

            // Check for corresponding signature file
            const sigEntry = sigMap.get(entry.filename);
            if (sigEntry) {
                pair.sig = await sigEntry.getData(new zip.BlobWriter());
            }

            sigPairs.push(pair);
        }
    }

    await reader.close();
    return sigPairs;
}
