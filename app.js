import "zip.js";
import stringify from "https://esm.sh/safe-stable-stringify";
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

//crypto verif functions

//convert string to ArrayBuffer character by character. Necessary to import the public key
function str2ab(str = "") {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

//
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);

    const length = binaryString.length;
    const bytes = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

// licences
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

//
async function licenseToKeyMapping(sigPair) {
    const licenses = await getLicenses(sigPair);

    let uuidMap = [];
    licenses.forEach((l) => {
        uuidMap.push({ id: l.uuid, pkey: l.signature_public_key });
    });

    return uuidMap;
}

//import an existing public key (Ed25519) in PEM format to verify the signature
function importRsaKey(pem) {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1);

    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey("spki", binaryDer, { name: "Ed25519" }, true, ["verify"]);
}

let publicKey;
//Verify the document signature and return true or false
async function verifySig(pem, signature, encodedData) {
    // Import the pk if not set yet
    if (!publicKey) {
        publicKey = await importRsaKey(pem);
    }

    // Verify the signature using the public key
    const verifyResult = await window.crypto.subtle.verify(
        {
            name: "Ed25519",
        },
        publicKey,
        signature,
        encodedData
    );

    return verifyResult;
}

//page rendering functions

// 1' Extract each file and pairs signature files with their corresponding document, returns an array of objects {doc, name, sig}
async function pairingSig(zipFile) {
    // Create a zip reader to read the zip file and get the files that are in it
    const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
    const entries = await reader.getEntries();

    let sigPairs = [];

    for (const entry of entries) {
        // Checks if the file is not a signature file then creates an object with the file blob and its name then adds it to the sigPair array
        if (!entry.filename.endsWith(".sig")) {
            sigPairs.push({ doc: await entry.getData(new zip.BlobWriter()) });
            sigPairs[sigPairs.length - 1].name = entry.filename;

            // Does a second for loop to find the corresponding signature file and adds it to the same object in the array
            for (const entry2 of entries) {
                // Checks if it's a .sig file and has the same name as the doc file (minus the .sig extension)
                if (entry2.filename.endsWith(".sig") && entry2.filename.replace(".sig", "") === entry.filename) {
                    // If true, adds the signature blob to the object
                    sigPairs[sigPairs.length - 1].sig = await entry2.getData(new zip.BlobWriter());
                }
            }
        }
    }

    await reader.close();

    return sigPairs;
}

// 2 Load the database from the sqlite file
async function loadDB(sqliteFile) {
    const buffer = await sqliteFile.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
}

// 3 Get the name of the tables in the db
function getTablesList() {
    // Query to get the names of the tables in the db (minus sqlite internal tables), maps the result and returns an array with the names or an empty one
    const tableList =
        db
            .exec(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)[0]
            ?.values.map((row) => row[0]) || [];

    return tableList;
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

// 5 Renders a table with the data from a selected db table
function displayTables(tables) {
    // Avoid stacking options on file change
    select.innerHTML = "";

    // Adds an empty option at the top of the select.
    const optionNull = document.createElement("option");
    optionNull.textContent = "-- Choisir une table --";
    select.appendChild(optionNull);

    // Adds an option element for the full facture to the select. This option is not a distinct table in the db.
    const facture = document.createElement("option");
    facture.value = "fullFacture";
    facture.innerHTML = "&#11088; Factures";
    select.appendChild(facture);

    // Creates an option element for each table in the db
    tables.forEach((table) => {
        const option = document.createElement("option");
        option.value = table;
        option.textContent = table;
        // Adds the generated option to the select
        select.appendChild(option);
    });
}

// 13 Display table content with pagination, 500 lines per page, calls itself on page change
function displayDataPag(tableName, page = 1, pageSize = 500) {
    // HTML element where the table is displayed
    const article = document.querySelector("#tabStructure");

    // Calculations to set the pagination and get the data for the current page
    const offset = (page - 1) * pageSize;
    const data = db.exec(`SELECT * FROM "${tableName}" LIMIT ${pageSize} OFFSET ${offset};`);

    // Query to get the length of the table, used to calculate the # of pages for pagination. Set total lines to 0 if table is empty (avoid errors)
    const totalLines = db.exec(`SELECT * FROM "${tableName}";`)[0]?.values.length || 0;
    const totalPages = Math.ceil(totalLines / pageSize);

    // Clears the article element before displaying a new table (on page change or table change). Avoids stacking tables
    while (article.firstChild) {
        article.removeChild(article.firstChild);
    }

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

    // Creates a responsive table with bootstrap classes, displays columns names in thead and values in tbody + a column for signature verifications

    // Div wrapper to make table responsive
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

    // Makes sure pagination is cleared
    paginationUl.innerHTML = "";

    // Creates a list item element for each page, adds class active to the current page
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === page ? "active" : ""}`;

        // Creates an anchor element for each page
        const a = document.createElement("a");
        a.className = "page-link";
        a.textContent = i;
        a.href = "#";

        // Adds an EL to each anchor to display the corresponding page on click
        a.addEventListener("click", (e) => {
            //Avoids jumping to the top of the page
            e.preventDefault();

            // Calls the function to display the selected page
            displayDataPag(tableName, i, pageSize);
        });

        // Adds the anchor to the list item, then adds the list item to the pagination
        li.appendChild(a);
        paginationUl.appendChild(li);
    }
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
    verifCard.appendChild(okSpan);
    verifCard.appendChild(koSpan);
}

// 17 Update the displayed table with the verification status for each line
async function updateTableDisplay(tableName, data) {
    const obj = rebuiltJson(tableName);
    const cryptoVerif = await Promise.all(obj.map((row) => verifyByLine(row)));

    const rows = document.querySelectorAll(`tr[data-signature]`);

    let apiVerif;
    let found = new Set(data.found);

    rows.forEach((row, i) => {
        if (found.has(row.dataset.signature)) {
            apiVerif = true;
        } else {
            apiVerif = false;
        }
        row.querySelector(".signature-status").innerHTML = iconVerif(cryptoVerif[i], apiVerif);
    });
}

// 21 Assign symbol to status verification (used in update table display)
function iconVerif(cryptoVerif, apiVerif) {
    const iconApi = apiVerif ? "&#9989;" : "&#10060;";
    const iconCrypto = cryptoVerif ? "&#128274;" : "&#10060;";

    return iconCrypto + iconApi;
}

// 8 Renders a card showing the verify() output of the file

// 8' Same as 8 but works with the sigPairs array
async function displayVerifArray(file) {
    // Gets the array of paired documents from the input file
    const sigPairs = await pairingSig(file);
    let pem;

    //verified
    let v = { count: 0 };
    //failed
    let f = { count: 0, filenames: [] };

    // Gets the pem file content for the public key (necessary to verify signature)
    for (const pair of sigPairs) {
        if (pair.name.endsWith(".pem")) {
            pem = await pair.doc.text();
        }
    }

    // If no pem file found, displays an alert and exits the function (avoid errors in the verify func)
    if (!pem) {
        verifCard.className = "card my-3 bg-info-subtle text-center text-info-emphasis";

        const article = document.createElement("article");
        article.className = "card-body";
        article.textContent = `Clé publique introuvable.`;
        verifCard.appendChild(article);

        return;
    }

    // For each object in the array, verifies if a signature exists
    for (const pair of sigPairs) {
        if (pair.sig) {
            // If it does, gets the signature and the document as array buffers
            const signature = await pair.sig.arrayBuffer();
            const encodedData = await pair.doc.arrayBuffer();

            //Uses pem, signature and document to verify the file
            const vSig = await verifySig(pem, signature, encodedData);

            // Updates the verified and failed counts and adds failed file names to the f object
            if (vSig) {
                v.count++;
            } else {
                f.count++;
                f.filenames.push(pair.name);
            }
        }
    }

    // Displays the results in a card with the number of fails and the (failed) file names
    verifCard.innerHTML = "";
    verifCard.className = "card my-3 bg-info-subtle text-center text-info-emphasis";
    const article = document.createElement("article");
    article.className = "card-body";
    article.textContent = `${f.count} fichier(s) KO : ${f.filenames.join(", ")} .`;
    verifCard.appendChild(article);
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

// 18 Build a json from a db table
function rebuiltJson(tableName) {
    if (tableName === "facture") {
        const facturesStmt = db.prepare(`SELECT * FROM facture;`);
        const articlesStmt = db.prepare(`SELECT * FROM facture_articles;`);
        const reglementsStmt = db.prepare(`SELECT * FROM facture_reglements;`);

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

        const output = [];
        for (const fac of factures) {
            let data = { ...fac };
            fac.articles = [];

            for (const itm of articles) {
                if (itm._parent === fac._id) {
                    fac.articles.push(
                        Object.fromEntries(
                            Object.entries(itm)
                                .filter(([key]) => key !== "_id" && key !== "_parent")
                                .sort()
                        )
                    );
                }
            }

            fac.reglements = [];
            for (const reg of reglements) {
                if (reg._parent === fac._id) {
                    fac.reglements.push(
                        Object.fromEntries(
                            Object.entries(reg)
                                .filter(([key]) => key !== "_id" && key !== "_parent")
                                .sort()
                        )
                    );
                }
            }

            data = { ...fac };

            output.push(data);
        }

        return output;
    } else {
        const { columns, rows } = getTableData(tableName);

        // 1 object
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
    //
    return Object.keys(objRow)
        .filter((key) => key !== "_id" && key !== "_signature" && !key.startsWith("meta_"))
        .sort()
        .reduce((obj, key) => {
            obj[key] = objRow[key];
            return obj;
        }, {});
}

//22
function getMeta(objRow) {
    return Object.keys(objRow)
        .filter((key) => key.startsWith("meta_"))
        .sort()
        .reduce((obj, key) => {
            const cleanKey = key.replace("meta_", "");
            obj[cleanKey] = objRow[key];
            if (cleanKey == "sas_sequence_id") {
                obj[cleanKey] = +obj[cleanKey];
            }
            return obj;
        }, {});
}

// 23
function rebuiltData(objRow) {
    const { previous_signature, ...meta } = getMeta(objRow);
    const sas_data = rebuiltSasData(objRow);

    return {
        previous_signature: previous_signature,
        sas_data,
        ...meta,
    };
}

// 24
function rebuiltRecord(objRow) {
    return {
        data: rebuiltData(objRow),
        signature: objRow._signature,
    };
}

// 25
function jsonCompact(obj) {
    //
    return stringify(obj);
}

// 20 Verify ONE line/entry/row of the object using web crypto, returns true or false
async function verifyByLine(objRow) {
    const file = input.files[0];
    const sigPairs = await pairingSig(file);

    const uuidMap = await licenseToKeyMapping(sigPairs);
    let pem;

    const line = rebuiltRecord(objRow);

    for (const obj of uuidMap) {
        if (line.data.sas_license_id === obj.id) {
            pem = obj.pkey;
        }
    }

    publicKey = await importRsaKey(pem);

    const signature = base64ToArrayBuffer(line.signature);

    const encodedData = str2ab(jsonCompact(line.data));

    // Verify the signature using the public key
    const verifyResult = await window.crypto.subtle.verify(
        {
            name: "Ed25519",
        },
        publicKey,
        signature,
        encodedData
    );

    return verifyResult;
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
function exportFactureCSV() {
    // make 3 queries to facture, facture_articles and facture_reglements, save the results to create one full facture view and export
    const facture = db.exec(`SELECT _id, total_ttc FROM facture;`);
    const articles = db.exec(
        `SELECT _parent, libelle, quantite, prix_unitaire, total_ht, taux_tva FROM facture_articles ORDER BY _parent ASC;`
    );
    const reglements = db.exec(
        `SELECT _parent, montant, mode_de_paiement, horodatage FROM facture_reglements ORDER BY _parent ASC;`
    );

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

    // Adds a confirmation on click to avoid accidental downloads
    exportBtn.onclick = () => {
        return confirm(`Télécharger la vue facture complète en CSV ?`);
    };
}

// 7 Manages actions triggered by adding a file to the input
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

    if (tableName === "fullFacture") {
        while (verifCard.firstChild) {
            verifCard.removeChild(verifCard.firstChild);
        }
        verifyBtn.classList.add("d-none");
        const alert = document.createElement("div");
        alert.className = "alert alert-secondary text-center mb-0";
        alert.textContent = "Cliquez sur le bouton Exporter pour télécharger la vue complète des factures en CSV.";
        verifCard.appendChild(alert);
    } else {
        verifCard.innerHTML = "";
        verifyBtn.classList.remove("d-none");
        displayDataPag(tableName);

        if (tableName.startsWith("facture_")) {
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
        exportFactureCSV();
        return;
    } else {
        // For other tables, export is standard
        genericExport(tableName);
    }
});
