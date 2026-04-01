export function verifyChain(fusion) {
    fusion.sort((a, b) => {
        return a.data.sas_sequence_id - b.data.sas_sequence_id;
    });

    const signatureMap = new Map();
    for (const row of fusion) {
        signatureMap.set(row.signature, row);
    }

    for (const row of fusion) {
        const prevSig = row.data.previous_signature;

        if (prevSig === null || row.data.sas_sequence_id === 0) continue;

        const prevRow = signatureMap.get(prevSig);

        if (!prevRow) {
            console.error("Missing previous signature", row);
            return false;
        }

        if (prevRow.data.sas_sequence_id + 1 !== row.data.sas_sequence_id) {
            console.error(
                `Sequence incoherent. Previous id : ${prevRow.data.sas_sequence_id} - Current id : ${row.data.sas_sequence_id}`
            );
            return false;
        }
    }
    return true;
}
