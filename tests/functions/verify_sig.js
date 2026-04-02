export async function verifySig(pem, signature, encodedData) {
    // Verify the signature using the public key
    const verifyResult = await crypto.subtle.verify(
        {
            name: "Ed25519",
        },
        pem,
        signature,
        encodedData
    );

    if (!verifyResult) {
        console.error("Signature mismatch", { pem, signature, encodedData });
    }

    return verifyResult;
}
