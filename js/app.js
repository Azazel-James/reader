import "zip.js";
import stringify from "./lib/safe-stable-stringify.mjs";

const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
});
let db = "";
const input = document.querySelector("#zipFileInput");
const select = document.querySelector("#tabSelect");
const exportBtn = document.querySelector("#exportBtn");
const verifCard = document.querySelector("#verify");
const verifyBtn = document.querySelector("#verifyBtn");
const paginationUl = document.querySelector(".pagination");
let tableName;
let paginationClickHandler = null;

//crypto verif functions

function utf8ToArrayBuffer(str) {
    const enc = new TextEncoder();
    return enc.encode(str).buffer;
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

//extract the licenses from the other documents of the zip file
async function getLicenses(sigPair) {
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

//extract and pair the uuid and public key from the license files. Used to choose the right key for verify()
async function licenseToKeyMapping(sigPair) {
    const licenses = await getLicenses(sigPair);
    const uuidMap = {};
    licenses.forEach((l) => {
        uuidMap[l.uuid] = l.signature_public_key;
    });
    return uuidMap;
}

//import an existing public key in PEM format (Ed25519). Used in verify()
function importRsaKey(pem) {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    pem = pem.replace(pemHeader, "");
    pem = pem.replace(pemFooter, "");
    pem = pem.replace(/\s/g, "");

    return window.crypto.subtle.importKey("spki", base64ToArrayBuffer(pem), { name: "Ed25519" }, true, ["verify"]);
}

let publicKey;
//Verify the document signature and return true or false
async function verifySig(pem, signature, encodedData) {
    // Import the pk if not set yet
    publicKey = await importRsaKey(pem);

    // Verify the signature using the public key
    const verifyResult = await window.crypto.subtle.verify(
        {
            name: "Ed25519",
        },
        publicKey,
        signature,
        encodedData
    );

    if (!verifyResult) {
        console.error("Signature mismatch", { pem, signature, encodedData, publicKey });
    }

    return verifyResult;
}

// 25 Stringify a json file in a compact and stable way. Makes sure the same result is always obtained with the same data
function jsonCompact(obj) {
    //Uses safe-stable-stringify library
    return stringify(obj);
}

// 20 Checks ONE line/entry/row of the object using web crypto, returns true or false
async function verifyByLine(objRow, uuidMapCache) {
    const file = input.files[0];
    const sigPairs = await pairingSig(file);
    const uuidMap = uuidMapCache || (await licenseToKeyMapping(sigPairs));

    const line = rebuiltRecord(objRow);
    const pem = uuidMap[line.data.sas_license_id];

    publicKey = await importRsaKey(pem);

    const signature = base64ToArrayBuffer(line.signature);

    const encodedData = utf8ToArrayBuffer(jsonCompact(line.data));

    // Verify the signature using the public key
    const verifyResult = await window.crypto.subtle.verify(
        {
            name: "Ed25519",
        },
        publicKey,
        signature,
        encodedData
    );

    if (!verifyResult) {
        console.error("Signature mismatch", { pem, signature, encodedData, publicKey });
        debugger;
    }

    return verifyResult;
}

// 26 Maps the signature and previous signature then verifies the chain is not broken
function verifyChain() {
    let fusion = [];

    const tables = getTablesList();
    tables.forEach((table) => {
        const obj = rebuiltJson(table);
        obj.forEach((row) => {
            const rec = rebuiltRecord(row);
            fusion.push(rec);
        });
    });

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

        if (prevRow.data.sas_sequence_id >= row.data.sas_sequence_id) {
            console.error("Sequence incoherent");
            return false;
        }
    }
    return true;
}

//JSON format rebuild function for crypto

// Helper function to build facture/factureannulation structures
function buildFactureStructure(mainTableName, articlesTableName, reglementsTableName) {
    const facturesStmt = db.prepare(`SELECT * FROM ${mainTableName};`);
    const articlesStmt = db.prepare(`SELECT * FROM ${articlesTableName};`);
    const reglementsStmt = db.prepare(`SELECT * FROM ${reglementsTableName};`);

    const factures = [];
    while (facturesStmt.step()) {
        factures.push(facturesStmt.getAsObject());
    }

    const articles = [];
    while (articlesStmt.step()) {
        articles.push(articlesStmt.getAsObject());
    }

    const reglements = [];
    while (reglementsStmt.step()) {
        reglements.push(reglementsStmt.getAsObject());
    }

    // Group by parent for faster lookup
    const articlesByParent = new Map();
    const reglementsByParent = new Map();

    articles.forEach((itm) => {
        if (!articlesByParent.has(itm._parent)) articlesByParent.set(itm._parent, []);
        articlesByParent.get(itm._parent).push(itm);
    });

    reglements.forEach((reg) => {
        if (!reglementsByParent.has(reg._parent)) reglementsByParent.set(reg._parent, []);
        reglementsByParent.get(reg._parent).push(reg);
    });

    return factures.map((fac) => {
        fac.articles = (articlesByParent.get(fac._id) || []).map((itm) =>
            Object.fromEntries(
                Object.entries(itm)
                    .filter(([key]) => key !== "_id" && key !== "_parent")
                    .sort()
            )
        );
        fac.reglements = (reglementsByParent.get(fac._id) || []).map((reg) =>
            Object.fromEntries(
                Object.entries(reg)
                    .filter(([key]) => key !== "_id" && key !== "_parent")
                    .sort()
            )
        );
        return fac;
    });
}

// 18 Build a json from a db table
function rebuiltJson(tableName) {
    if (tableName === "facture") {
        return buildFactureStructure("facture", "facture_articles", "facture_reglements");
    } else if (tableName === "factureannulation") {
        return buildFactureStructure("factureannulation", "factureannulation_articles", "factureannulation_reglements");
    } else {
        const { columns, rows } = getTableData(tableName);

        let lines = rows.map((line) => {
            const obj = {};

            columns.forEach((col, i) => {
                obj[col] = line[i];
            });
            return obj;
        });
        return lines;
    }
}

// 19 Returns an object for the sas_data (works for ONE entry/row/line of the json file)
function rebuiltSasData(objRow) {
    const sas_data = {};
    const sortedKeys = Object.keys(objRow)
        .filter((key) => key !== "_id" && key !== "_signature" && !key.startsWith("meta_"))
        .sort();

    sortedKeys.forEach((key) => {
        sas_data[key] = objRow[key];
    });
    return sas_data;
}

//22 Get the meta data used to rebuild the Data object (one line)
function getMeta(objRow) {
    const meta = {};
    const sortedKeys = Object.keys(objRow)
        .filter((key) => key.startsWith("meta_"))
        .sort();

    sortedKeys.forEach((key) => {
        const cleanKey = key.slice(5); // More efficient than replace
        meta[cleanKey] = cleanKey === "sas_sequence_id" ? +objRow[key] : objRow[key];
    });
    return meta;
}

// 23 Returns an object with all the data of the record, meta + sas data (one line)
function rebuiltData(objRow) {
    const { previous_signature, ...meta } = getMeta(objRow);

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

// 24 Returns an object with the full data and the signature of the record entry (one line)
function rebuiltRecord(objRow) {
    return {
        data: rebuiltData(objRow),
        signature: objRow._signature,
    };
}

//document extracting function
// 1' Extract each file and pairs signature files with their corresponding document, returns an array of objects {doc, name, sig}
async function pairingSig(zipFile) {
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
    const entries = await reader.getEntries();

    // Create a map of signature files for O(1) lookup
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

//database functions

// 2 Load the database from the sqlite file
async function loadDB(sqliteFile) {
    const buffer = await sqliteFile.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
}

// 3 Get the name of the tables in the db
function getTablesList() {
    return (
        db
            .exec(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)[0]
            ?.values.map((row) => row[0]) || []
    );
}

// 4 Get the data inside one table
function getTableData(tableName) {
    // Query to get all the data from one table
    const data = db.exec(`SELECT * FROM "${tableName}";`);

    // If the table is empty, returns empty columns and rows to avoid errors
    if (!data.length) return { columns: [], rows: [] };

    // Otherwise, returns an object with the columns names and the values (one array per record/line)
    return {
        columns: data[0].columns,
        rows: data[0].values,
    };
}

//page rendering functions

// 8 Renders a card showing the verify() output of the file
async function displayVerifArray(file) {
    const sigPairs = await pairingSig(file);

    // Find pem file efficiently
    const pemPair = sigPairs.find((pair) => pair.name.endsWith(".pem"));
    const pem = pemPair ? await pemPair.doc.text() : null;

    // If no pem file found, displays an alert and exits the function
    if (!pem) {
        verifCard.className = "card my-3 bg-info-subtle text-center text-info-emphasis";
        const article = document.createElement("article");
        article.className = "card-body";
        article.textContent = `Clé publique introuvable.`;
        verifCard.appendChild(article);
        return;
    }

    // Verify all files with signatures in parallel
    const verified = await Promise.all(
        sigPairs.map(async (pair) => {
            if (!pair.sig) return { valid: null, name: pair.name };
            return {
                valid: await verifySig(pem, await pair.sig.arrayBuffer(), await pair.doc.arrayBuffer()),
                name: pair.name,
            };
        })
    );

    // Count failures
    const failed = verified.filter((v) => v.valid === false);

    // Chain verify
    const chainVerif = verifyChain();

    // Display results
    verifCard.innerHTML = "";
    verifCard.className = "card my-3 bg-info-subtle text-center text-info-emphasis";
    const article = document.createElement("article");
    article.className = "card-body";
    article.innerHTML = `${failed.length} fichier(s) KO : ${failed.map((f) => f.name).join(", ")} . <br> ${chainVerif ? "&#128279; Chaînage cryptographique OK !" : "&#10060; Chaîne brisée !"}`;
    verifCard.appendChild(article);
}

// 5 Renders a table with the data from a selected db table
function displayTables(tables) {
    const options = [
        { value: "", text: "-- Choisir une table --" },
        { value: "fullFacture", text: "&#11088; Factures" },
        { value: "fullFactureAnnul", text: "&#11088; Factures Annulation" },
        ...tables.map((table) => ({ value: table, text: table })),
    ];

    select.innerHTML = options.map((opt) => `<option value="${opt.value}">${opt.text}</option>`).join("");
}

// 13 Display table content with pagination, 500 lines per page, calls itself on page change
function displayDataPag(tableName, page = 1, pageSize = 500) {
    const article = document.querySelector("#tabStructure");

    // Get total count efficiently
    const countResult = db.exec(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
    const totalLines = countResult[0]?.values[0][0] || 0;
    const totalPages = Math.ceil(totalLines / pageSize);

    // Get data for current page
    const offset = (page - 1) * pageSize;
    const data = db.exec(`SELECT * FROM "${tableName}" LIMIT ${pageSize} OFFSET ${offset};`);

    // Clears the article element before displaying a new table (on page change or table change)
    article.innerHTML = "";

    // Adds a title with the table name (uppercased) on top of the displayed table
    const title = document.createElement("h4");
    title.className = "mb-3 p-2 bg-secondary-subtle text-secondary-emphasis text-center rounded";
    title.textContent = tableName.toUpperCase();
    article.appendChild(title);

    // If the table is empty, displays an alert and exits the function (avoid errors)
    if (totalLines === 0) {
        const alert = document.createElement("div");
        alert.className = "alert alert-secondary";
        alert.textContent = "Aucune donnée.";
        article.appendChild(alert);
        return;
    }

    const dataWrapper = document.createElement("div");
    dataWrapper.className = "table-responsive";

    // Table element stripped, bordered, hoverable and little padding
    const dataTable = document.createElement("table");
    dataTable.className = "table table-hover table-striped table-bordered table-sm align-middle";

    // Thead with dark background for column names
    const thead = document.createElement("thead");
    thead.className = "table-dark";

    // Table row element for the table head
    const hRow = document.createElement("tr");

    // Creates a table header element for each column name and adds it to the head row.
    data[0].columns.forEach((colName) => {
        const th = document.createElement("th");
        th.textContent = colName;
        hRow.appendChild(th);
    });

    // Adds a header for the verification status column
    const th = document.createElement("th");
    th.textContent = "Vérification";
    hRow.appendChild(th);

    // Adds the header row to the table head, then adds the head to the table
    thead.appendChild(hRow);
    dataTable.appendChild(thead);

    // Table body element
    const tbody = document.createElement("tbody");

    // Creates a table row for each record/line, adds a data-id attribute (necessary to update verification status later)
    data[0].values.forEach((rowData) => {
        const row = document.createElement("tr");
        row.dataset.signature = rowData[1];

        // Creates a table data element (cell) for each value in the record/line, adds value as text content, adds cell to row
        rowData.forEach((cell) => {
            const td = document.createElement("td");
            td.textContent = cell ?? "";
            row.appendChild(td);
        });

        // Creates a cell for the signature verification, adds a class (necessary for update), adds default content,
        // adds cell to row before adding row to table body
        const statusCell = document.createElement("td");
        statusCell.classList.add("signature-status", "text-center");
        statusCell.innerHTML = "&#9203; Statut inconnu"; //Hourglass symbol
        row.appendChild(statusCell);
        tbody.appendChild(row);
    });

    // Adds table body to table, then adds table to wrapper, then adds wrapper to article
    dataTable.appendChild(tbody);
    dataWrapper.appendChild(dataTable);
    article.appendChild(dataWrapper);

    // Render pagination
    paginationUl.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === page ? "active" : ""}`;

        const a = document.createElement("a");
        a.className = "page-link";
        a.textContent = i;
        a.href = "#";
        a.dataset.page = i;

        li.appendChild(a);
        paginationUl.appendChild(li);
    }

    // Single delegated event listener for all pagination links
    if (paginationClickHandler) {
        paginationUl.removeEventListener("click", paginationClickHandler);
    }
    paginationClickHandler = (e) => {
        if (e.target.dataset.page) {
            e.preventDefault();
            displayDataPag(tableName, parseInt(e.target.dataset.page), pageSize);
        }
    };
    paginationUl.addEventListener("click", paginationClickHandler);
}

// 15 Displays the counts for verification status
function countDisplay(data) {
    const okSpan = document.createElement("span");
    okSpan.className = "alert alert-success mb-1";
    okSpan.innerHTML = `&#9989; ${data.found.length} signature(s) trouvée(s)`;

    const koSpan = document.createElement("span");
    koSpan.className = "alert alert-danger mb-0";
    koSpan.innerHTML = `&#10060; ${data.missing.length} signature(s) manquante(s)`;

    verifCard.className = "card my-3 text-center";
    verifCard.innerHTML = "";
    verifCard.append(okSpan, koSpan);
}

// 17 Update the displayed table with the verification status for each line
async function updateTableDisplay(tableName, data) {
    const obj = rebuiltJson(tableName);
    const file = input.files[0];
    const sigPairs = await pairingSig(file);
    const uuidMapCache = await licenseToKeyMapping(sigPairs);

    const cryptoVerif = await Promise.all(obj.map((row) => verifyByLine(row, uuidMapCache)));
    const rows = document.querySelectorAll(`tr[data-signature]`);
    const found = new Set(data.found);

    rows.forEach((row, i) => {
        const apiVerif = found.has(row.dataset.signature);
        row.querySelector(".signature-status").innerHTML = iconVerif(cryptoVerif[i], apiVerif);
    });
}

// 21 Assign symbol to status verification (used in update table display)
function iconVerif(cryptoVerif, apiVerif) {
    return (cryptoVerif ? "&#128274;" : "&#10060;") + (apiVerif ? "&#9989;" : "&#10060;");
}

// 10 Send signatures to SAS to verify them. Calls update table fn if it gets an answer.
async function saslogVerify(tableName) {
    const table = getTableData(tableName);
    const payload = table.rows.map((row) => row[1]);

    // Calls the API with the data array in the body, logs the response or errors
    fetch("https://saslog.dokos.cloud/saslog/v1/verifyMany", {
        method: "POST",
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            countDisplay(data);
            updateTableDisplay(tableName, data);
        })
        .catch((error) => {
            console.error("Erreur lors de la vérification :", error);
        });
}

// 12 Export a table as a csv file, table = select option
function genericExport(tableName) {
    // Gets the data from the selected table
    const { columns, rows } = getTableData(tableName);

    // Creates the csv content by joining collumns and rows, adds the necessary header for the csv file
    let csvContent =
        "data:text/csv;charset=utf-8," + columns.join(",") + "\n" + rows.map((e) => e.join(",")).join("\n");

    // Turns the csv content into an encoded URI
    const encodedUri = encodeURI(csvContent);

    // Sets the href to the encoded URI and download attribute file name to a default value for the export link/btn
    exportBtn.setAttribute("href", encodedUri);
    exportBtn.setAttribute("download", `${tableName}_table_export.csv`);
}

//14 Export facture as a csv file
function exportFactureCSV(facture, articles, reglements) {
    // create an array of objects with the data from the 3 tables, each object represents a facture with its articles and reglements
    // every element in one object as the same parent id as the facture id
    // {facture.id, prix, articles[{libelle, quantite, prix_unitaire, total_ht, taux_tva}], reglements[{montant, mode_de_paiement, horodatage}]}

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

    // Writes the full facture content as a delimited flat file
    let csvContent =
        // "data:text/csv;charset=utf-8," +
        // [
        //     "facture.id",
        //     "facture.total_ttc",
        //     "facture_articles.libelle",
        //     "facture_articles.quantite",
        //     "facture_articles.prix_unitaire",
        //     "facture_articles.total_ht",
        //     "facture_articles.taux_tva",
        //     "facture_reglements.montant",
        //     "facture_reglements.mode_de_paiement",
        //     "facture_reglements.horodatage",
        // ].join(",") +
        // "\n";
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
    exportBtn.setAttribute("href", encodedUri);
    exportBtn.setAttribute("download", `full_facture_export.csv`);
    if (tableName === "fullFactureAnnul") {
        exportBtn.setAttribute("download", `facture_annulation_export.csv`);
    }
}

// 7 Manage actions triggered by user
input.addEventListener("change", async () => {
    // Gets the file from the input, exits if no file is selected (avoid errors)
    const file = input.files[0];
    if (!file) return;

    // Gets the array of paired documents from the input file
    const sigPairs = await pairingSig(file);

    // Displays the general file verification results
    displayVerifArray(file);

    // Gets the .sqlite file from the array to load the db
    // (assuming there's only one .sqlite file in the archive, if there are several it will take the first one it finds)
    const sqliteFile = sigPairs.find((pair) => pair.name.endsWith(".sqlite")).doc;

    await loadDB(sqliteFile);

    // Gets the list of table names from the db, sends the result to the display table function (create the select options)
    const tables = getTablesList();
    displayTables(tables);
});

select.addEventListener("change", () => {
    tableName = select.value;

    if (!tableName) return;

    if (tableName === "fullFacture" || tableName === "fullFactureAnnul") {
        while (verifCard.firstChild) {
            verifCard.removeChild(verifCard.firstChild);
        }
        verifyBtn.classList.add("d-none");
        const alert = document.createElement("div");
        alert.className = "alert alert-secondary text-center mb-0";
        alert.textContent = "Cliquez sur le bouton Exporter pour télécharger la vue complète des factures en CSV.";
        verifCard.classList.remove("bg-info-subtle");
        verifCard.appendChild(alert);
    } else {
        verifCard.innerHTML = "";
        verifyBtn.classList.remove("d-none");
        displayDataPag(tableName);

        if (tableName.startsWith("facture_") || tableName.startsWith("factureannulation_")) {
            verifyBtn.classList.add("disabled");
            document.querySelectorAll(".signature-status").forEach((cell) => {
                cell.innerHTML = `&#9203; Pas de signature`;
            });
        } else {
            verifyBtn.classList.remove("disabled");
        }
    }
});

verifyBtn.addEventListener("click", () => {
    saslogVerify(tableName);
});

exportBtn.addEventListener("click", () => {
    // Facture export gathers data from facture table and its child tables so it has a specific export function
    if (tableName === "fullFacture") {
        // Queries to set the export function for facture table
        const facture = db.exec(`SELECT _id, total_ttc FROM facture;`);
        const articles = db.exec(
            `SELECT _parent, libelle, quantite, prix_unitaire, total_ht, taux_tva FROM facture_articles ORDER BY _parent ASC;`
        );
        const reglements = db.exec(
            `SELECT _parent, montant, mode_de_paiement, horodatage FROM facture_reglements ORDER BY _parent ASC;`
        );

        //Download the csv file
        exportFactureCSV(facture, articles, reglements);
    } else if (tableName === "fullFactureAnnul") {
        // Queries to set the export function for facture annulation table
        const facture = db.exec(`SELECT _id, total_ttc FROM factureannulation;`);
        const articles = db.exec(
            `SELECT _parent, libelle, quantite, prix_unitaire, total_ht, taux_tva FROM factureannulation_articles ORDER BY _parent ASC;`
        );
        const reglements = db.exec(
            `SELECT _parent, montant, mode_de_paiement, horodatage FROM factureannulation_reglements ORDER BY _parent ASC;`
        );

        //Download the csv file
        exportFactureCSV(facture, articles, reglements);
    } else {
        // For other tables, export is standard
        genericExport(tableName);
    }
});
