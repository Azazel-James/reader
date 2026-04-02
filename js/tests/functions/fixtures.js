//rebuilt json results for building data, meta and record
export const row1 = {
    _id: "abc",
    _signature: "valid_1",
    meta_sas_sequence_id: "0",
    meta_previous_signature: "valid_0",
    meta_sas_data_type: "AA",
    name: "A",
    doctype: "AAA",
};

export const row2 = {
    _id: "def",
    _signature: "valid_2",
    meta_sas_sequence_id: "1",
    meta_previous_signature: "valid_1",
    meta_sas_data_type: "AA",
    name: "B",
    doctype: "AAA",
};

export const row3 = {
    _id: "def",
    _signature: "valid_3",
    name: "C",
    doctype: "AAA",
};

export const rowNaN = {
    _id: "jkl",
    _signature: "valid_4",
    meta_sas_sequence_id: "quatre",
    meta_previous_signature: "valid_3",
    meta_sas_data_type: "AA",
    name: "D",
    doctype: "AAA",
};

export const rowHuhoh = {
    _id: "ghi",
    _signature: "invalid",
    meta_sas_sequence_id: "2",
    meta_previous_signature: "valid_2",
    meta_sas_data_type: "AA",
    name: "Z",
    doctype: "AAA",
};

//facture export + query result (any)
export const facture = [{ columns: ["_id", "total_ttc"], values: [["abc", "120"]] }];
export const articles = [
    {
        columns: ["_parent", "libelle", "quantite", "prix_unitaire", "total_ht", "taux_tva"],
        values: [["abc", "article1", "1", "100", "100", "2.00"]],
    },
];
export const reglements = [
    {
        columns: ["_parent", "montant", "mode_de_paiement", "horodatage"],
        values: [["abc", "120", "CB", "2026-04-02 09:45:00"]],
    },
];

export const csv = [
    "data:text/csv;charset=utf-8,ID Facture,Total TTC,Article,Quantité,Prix Unitaire,Total HT,TVA,Règlement,Mode de Paiement,Horodatage\nabc, 120,,,,,,,\nabc,, article1, 1, 100, 100, 2.00,,\nabc,,,,,,, 120, CB, 2026-04-02 09:45:00\n",
];

//csv export basic
export const columns = ["id", "sig", "name"];
export const rows = [
    ["abc", "sig_1", "A"],
    ["def", "sig_2", "B"],
];

export const columnsobj = { columns: ["id", "sig", "name"] };
export const rowsobj = {
    rows: [
        ["abc", "sig_1", "A"],
        ["def", "sig_2", "B"],
    ],
};
