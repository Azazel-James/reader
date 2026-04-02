export async function saslogVerify(payload) {
    // Calls the API with the data array in the body, logs the response or errors
    return fetch("https://saslog.dokos.cloud/saslog/v1/verifyMany", {
        method: "POST",
        body: JSON.stringify(payload),
    }).then((response) => response.json());
}
