import "zip.js";

const SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`,
});
let db = "";
const input = document.querySelector("#zipFileInput");
const select = document.querySelector("#tabSelect");
const verifCard = document.querySelector("#verify");
const paginationUl = document.querySelector(".pagination");

//crypto verif functions

//convert string to ArrayBuffer
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

//import an existing public key (Ed25519) in PEM format to verify the signature
function importRsaKey(pem) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1,
  );
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "Ed25519" },
    true,
    ["verify"],
  );
}

let publicKey;
//Verify the document signature and return true or false
async function verifySig(pem, signature, encodedData) {
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
    encodedData,
  );

  return verifyResult;
}

//page rendering functions

// 1 Extract the .sqlite, .sqlite.sig, .pem files from the archive returns blob files
// async function getFile(zipF) {
//   const reader = new zip.ZipReader(new zip.BlobReader(zipF));
//   const entries = await reader.getEntries();

//   let dbFile, sigFile, keyFile;

//   for (const entry of entries) {
//     if (entry.filename.endsWith(".sqlite")) {
//       dbFile = await entry.getData(new zip.BlobWriter());
//     } else if (entry.filename.endsWith(".sqlite.sig")) {
//       sigFile = await entry.getData(new zip.BlobWriter());
//     } else if (entry.filename.endsWith(".pem")) {
//       keyFile = await entry.getData(new zip.BlobWriter());
//     }
//   }
//   await reader.close();
//   return { dbFile, sigFile, keyFile };
// }

// 1' Extract each file and pairs signature files with their corresponding document, returns an array of objects {doc, name, sig}
async function pairingSig(zipFile) {
  const reader = new zip.ZipReader(new zip.BlobReader(zipFile));
  const entries = await reader.getEntries();

  let sigPairs = [];

  for (const entry of entries) {
    if (!entry.filename.endsWith(".sig")) {
      sigPairs.push({ doc: await entry.getData(new zip.BlobWriter()) });
      sigPairs[sigPairs.length - 1].name = entry.filename;
      for (const entry2 of entries) {
        if (
          entry2.filename.endsWith(".sig") &&
          entry2.filename.replace(".sig", "") === entry.filename
        ) {
          sigPairs[sigPairs.length - 1].sig = await entry2.getData(
            new zip.BlobWriter(),
          );
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
  const tableList =
    db
      .exec(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`,
      )[0]
      ?.values.map((row) => row[0]) || [];

  return tableList;
}

// 4 Get the data inside one table
function getTableData(tableName) {
  const data = db.exec(`SELECT * FROM "${tableName}";`);

  if (!data.length) return { columns: [], rows: [] };

  return {
    columns: data[0].columns,
    rows: data[0].values,
  };
}

// 5 Renders a table with the data from a selected db table
function displayTables(tables) {
  tables.forEach((table) => {
    const option = document.createElement("option");
    option.value = table;
    option.textContent = table;

    select.addEventListener("change", (e) => {
      const tableName = e.target.value;
      if (!tableName) return;

      paginateTable(tableName);
    });

    select.appendChild(option);
  });
}

// 13 Pagination displayed table 500 lines per page
function paginateTable(tableName, page = 1, pageSize = 500) {
  const article = document.querySelector("#tabStructure");

  const offset = (page - 1) * pageSize;
  const data = db.exec(
    `SELECT * FROM "${tableName}" LIMIT ${pageSize} OFFSET ${offset};`,
  );
  const totalLines =
    db.exec(`SELECT * FROM "${tableName}";`)[0]?.values.length || 0;
  const totalPages = Math.ceil(totalLines / pageSize);

  while (article.firstChild) {
    article.removeChild(article.firstChild);
  }

  const title = document.createElement("h4");
  title.className =
    "mb-3 p-2 bg-secondary-subtle text-secondary-emphasis text-center rounded";
  title.textContent = tableName.toUpperCase();
  article.appendChild(title);

  if (totalLines === 0) {
    const alert = document.createElement("div");
    alert.className = "alert alert-secondary";
    alert.textContent = "Aucune donnée.";
    article.appendChild(alert);
    return;
  }

  const dataWrapper = document.createElement("div");
  dataWrapper.className = "table-responsive";

  const dataTable = document.createElement("table");
  dataTable.className =
    "table table-hover table-striped table-bordered table-sm";

  const thead = document.createElement("thead");
  thead.className = "table-dark";

  const hRow = document.createElement("tr");

  data[0].columns.forEach((colName) => {
    const th = document.createElement("th");
    th.textContent = colName;
    hRow.appendChild(th);
  });

  thead.appendChild(hRow);
  dataTable.appendChild(thead);

  const tbody = document.createElement("tbody");

  data[0].values.forEach((rowData) => {
    const row = document.createElement("tr");
    rowData.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell ?? "";
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  dataTable.appendChild(tbody);
  dataWrapper.appendChild(dataTable);
  article.appendChild(dataWrapper);

  paginationUl.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === page ? "active" : ""}`;

    const a = document.createElement("a");
    a.className = "page-link";
    a.textContent = i;
    a.href = "#";

    a.addEventListener("click", (e) => {
      e.preventDefault();
      console.log(i);

      paginateTable(tableName, i, pageSize);
    });

    li.appendChild(a);
    paginationUl.appendChild(li);
  }
}

// 8 Renders a card showing the verify() output of the file
// async function displayVerif(file) {
//   const { dbFile, sigFile, keyFile } = await getFile(file);
//   const encodedData = await dbFile.arrayBuffer();
//   const signature = await sigFile.arrayBuffer();
//   const pem = await keyFile.text();

//   const vSig = await verifySig(pem, signature, encodedData);

//   if (vSig) {
//     verifCard.className = "card bg-success-subtle text-success-emphasis mt-3";
//     verifCard.querySelector(".card-body").textContent =
//       "Signature vérifiée : le fichier n'a pas été modifié depuis sa signature.";
//   } else {
//     verifCard.className = "card bg-danger-subtle text-danger-emphasis mt-3";
//     verifCard.querySelector(".card-body").textContent =
//       "Signature non vérifiée : le fichier a été modifié depuis sa signature.";
//   }
//   return vSig;
// }

// 8' Same as 8 but works with the sigPairs array
async function displayVerifArray(file) {
  const sigPairs = await pairingSig(file);
  let pem;
  let v = { count: 0 };
  let f = { count: 0, filenames: [] };

  for (const pair of sigPairs) {
    if (pair.name.endsWith(".pem")) {
      pem = await pair.doc.text();
    }
  }

  sigPairs.forEach(async (pair) => {
    if (pair.sig) {
      const signature = await pair.sig.arrayBuffer();
      const encodedData = await pair.doc.arrayBuffer();
      const vSig = await verifySig(pem, signature, encodedData);

      if (vSig) {
        v.count++;
      } else {
        f.count++;
        f.filenames.push(pair.name);
      }
    }
    verifCard.className = "card my-3 bg-info-subtle text-info-emphasis";
    verifCard.querySelector(".card-body").textContent =
      `${f.count} fichier(s) KO : ${f.filenames.join(", ")} .`;
  });
}

//9 Get a saved query result (view param) and export it as a csv file
function exportViewAsCSV(view) {
  const columns = view[0].columns || [];
  const rows = view[0].values || [];

  let csvContent =
    "data:text/csv;charset=utf-8," +
    columns.join(",") +
    "\n" +
    rows.map((e) => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "view_export.csv");

  document.body.appendChild(link);
  link.onclick = () => {
    return confirm("Télécharger la vue en CSV ?");
  };
  link.click();
  document.body.removeChild(link);
}

// 10 Call to remote SAS to get original signatures file to compare it to the signatures stored in the db facture table
async function saslogVerify() {
  // code here
}

// 11 Renders the result of the comparison in a new card on the HTML page

// 12 Export each table from the db as a csv file one dowload in a zip file
async function exportAllTablesAsCSV() {
  const tables = getTablesList();
  let zipExportAll = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

  tables.forEach((table) => {
    const { columns, rows } = getTableData(table);
    let csvContent =
      "data:text/csv;charset=utf-8," +
      columns.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");
    zipExportAll.add(
      `${table}_table_export.csv`,
      new zip.TextReader(csvContent),
    );
  });

  // Save the zip file
  const zipBlob = await zipExportAll.close();
  const encodedUri = encodeURI(URL.createObjectURL(zipBlob));
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "all_tables_export.zip");

  document.body.appendChild(link);
  link.onclick = () => {
    return confirm(`Télécharger toutes les tables en CSV zip ?`);
  };
  link.click();
  document.body.removeChild(link);
}

//14 Export facture as a csv file
function exportFactureCSV() {
  // make 3 queries to facture, facture_articles and facture_reglements, save the results to create one full facture view and export
  const facture = db.exec(`SELECT id AS "facture.id", total_ttc FROM facture;`);
  const articles = db.exec(
    `SELECT parent, libelle, quantite, prix_unitaire, total_ht, taux_tva FROM facture_articles ORDER BY parent ASC;`,
  );
  const reglements = db.exec(
    `SELECT parent, montant, mode_de_paiement AS en FROM facture_reglements ORDER BY parent ASC;`,
  );

  console.log(facture, articles, reglements);
  // create an array of objects with the data from the 3 tables, each object represents a facture with its articles and reglements
  // every element in one object as the same parent id as the facture id
  // {facture.id, prix, articles[{libelle, quantite, prix_unitaire, total_ht, taux_tva}], reglements[{montant, mode_de_paiement}]}

  let fullFacture = [];

  facture[0].values.forEach((f) => {
    const fObj = { facture_id: f[0], prix: f[1], articles: [], reglements: [] };

    articles[0].values.forEach((a) => {
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

    reglements[0].values.forEach((r) => {
      if (r[0] === fObj.facture_id) {
        fObj.reglements.push({
          montant: r[1],
          mode_de_paiement: r[2],
        });
      }
    });

    fullFacture.push(fObj);
  });

  console.log(fullFacture);
  // export fullFacture as a dff csv file
  let csvContent =
    "data:text/csv;charset=utf-8," +
    [
      "facture.id",
      "facture.total_ttc",
      "facture_articles.libelle",
      "facture_articles.quantite",
      "facture_articles.prix_unitaire",
      "facture_articles.total_ht",
      "facture_articles.taux_tva",
      "facture_reglements.montant",
      "facture_reglements.mode_de_paiement",
    ].join(",") +
    "\n";
  fullFacture.forEach((f) => {
    csvContent += `${f.facture_id}, ${f.prix},,,,,,,\n`;
    f.articles.forEach((a) => {
      csvContent += `${f.facture_id},, ${a.libelle}, ${a.quantite}, ${a.prix_unitaire}, ${a.total_ht}, ${a.taux_tva},,\n`;
    });
    f.reglements.forEach((r) => {
      csvContent += `${f.facture_id},,,,,,, ${r.montant}, ${r.mode_de_paiement}\n`;
    });
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `full_facture_export.csv`);

  document.body.appendChild(link);
  link.onclick = () => {
    return confirm(`Télécharger la vue facture complète en CSV ?`);
  };
  link.click();
  document.body.removeChild(link);
}

// 7 Manages actions triggered by event on the select input used to choose the displayed table
input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const sigPairs = await pairingSig(file);

  displayVerifArray(file);

  const sqliteFile = sigPairs.find((pair) => pair.name.endsWith(".sqlite")).doc;

  await loadDB(sqliteFile);

  exportFactureCSV();
  exportAllTablesAsCSV();

  const tables = getTablesList();
  displayTables(tables);
});
