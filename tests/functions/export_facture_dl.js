export function downloadfacture(facture, articles, reglements) {
    let fullFacture = [];

    facture[0]?.values.forEach((f) => {
        const fObj = { facture_id: f[0], prix: f[1], articles: [], reglements: [] };

        articles[0]?.values.forEach((a) => {
            if (a[0] === fObj.facture_id) {
                fObj.articles.push({
                    libelle: a[1],
                    quantite: a[2],
                    prix_unitaire: a[3],
                    total_ht: a[4],
                    taux_tva: a[5],
                });
            }
        });

        reglements[0]?.values.forEach((r) => {
            if (r[0] === fObj.facture_id) {
                fObj.reglements.push({
                    montant: r[1],
                    mode_de_paiement: r[2],
                    horodatage: r[3],
                });
            }
        });

        fullFacture.push(fObj);
    });

    if (fullFacture.length === 0) {
        throw new Error("Empty table");
    }

    // Writes the full facture content as a delimited flat file
    let csvContent =
        "data:text/csv;charset=utf-8," +
        [
            "ID Facture",
            "Total TTC",
            "Article",
            "Quantité",
            "Prix Unitaire",
            "Total HT",
            "TVA",
            "Règlement",
            "Mode de Paiement",
            "Horodatage",
        ].join(",") +
        "\n";

    fullFacture.forEach((f) => {
        csvContent += `${f.facture_id}, ${f.prix},,,,,,,\n`;
        f.articles.forEach((a) => {
            csvContent += `${f.facture_id},, ${a.libelle}, ${a.quantite}, ${a.prix_unitaire}, ${a.total_ht}, ${a.taux_tva},,\n`;
        });
        f.reglements.forEach((r) => {
            csvContent += `${f.facture_id},,,,,,, ${r.montant}, ${r.mode_de_paiement}, ${r.horodatage}\n`;
        });
    });

    // Turns the csv content into an encoded URI
    const encodedUri = encodeURI(csvContent);
    // Sets the href to the encoded URI and download attribute file name to a default value for the export link/btn
    const exportBtn = document.createElement("a");

    exportBtn.setAttribute("href", encodedUri);
    exportBtn.setAttribute("download", `full_facture_export.csv`);

    exportBtn.click();
    exportBtn.remove();

    return encodedUri;
}
