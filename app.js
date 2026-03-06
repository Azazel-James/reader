import "zip.js";

const SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`,
});
let db = "";
const select = document.querySelector("#tabSelect");
const verifCard = document.querySelector("#verify");

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

// 1 Extract the .sqlite, .sqlite.sig, .pem files from the archive return a blob files
async function getFile(zipF) {
  const reader = new zip.ZipReader(new zip.BlobReader(zipF));
  const entries = await reader.getEntries();

  let dbFile, sigFile, keyFile;

  for (const entry of entries) {
    if (entry.filename.endsWith(".sqlite")) {
      dbFile = await entry.getData(new zip.BlobWriter());
    } else if (entry.filename.endsWith(".sqlite.sig")) {
      sigFile = await entry.getData(new zip.BlobWriter());
    } else if (entry.filename.endsWith(".pem")) {
      keyFile = await entry.getData(new zip.BlobWriter());
    }
  }
  await reader.close();
  return { dbFile, sigFile, keyFile };
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
function getTableData(tableName, limit = 50) {
  const data = db.exec(`SELECT * FROM "${tableName}" LIMIT ${limit};`);

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

      displayContent(tableName);
    });

    select.appendChild(option);
  });
}

// 6 Renders the data to add to the HTML table
function displayContent(tableName) {
  const article = document.querySelector("#tabStructure");

  while (article.firstChild) {
    article.removeChild(article.firstChild);
  }

  const title = document.createElement("h4");
  title.className =
    "mb-3 p-2 bg-secondary-subtle text-secondary-emphasis text-center rounded";
  title.textContent = tableName.toUpperCase();
  article.appendChild(title);

  const dataTitle = document.createElement("h6");
  dataTitle.textContent = "Données (max 50 lignes)";
  dataTitle.className = "mt-4";
  article.appendChild(dataTitle);

  const { columns, rows } = getTableData(tableName);

  if (!rows.length) {
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

  console.log(columns);

  columns.forEach((colName) => {
    const th = document.createElement("th");
    th.textContent = colName;
    hRow.appendChild(th);
  });

  thead.appendChild(hRow);
  dataTable.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach((rowData) => {
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
}

// 8 Renders a card showing the verify() output of the file
async function displayVerif(file) {
  const { dbFile, sigFile, keyFile } = await getFile(file);
  const encodedData = await dbFile.arrayBuffer();
  const signature = await sigFile.arrayBuffer();
  const pem = await keyFile.text();

  const vSig = await verifySig(pem, signature, encodedData);

  if (vSig) {
    verifCard.className = "card bg-success-subtle text-success-emphasis mt-3";
    verifCard.querySelector(".card-body").textContent =
      "Signature vérifiée : le fichier n'a pas été modifié depuis sa signature.";
  } else {
    verifCard.className = "card bg-danger-subtle text-danger-emphasis mt-3";
    verifCard.querySelector(".card-body").textContent =
      "Signature non vérifiée : le fichier a été modifié depuis sa signature.";
  }
  return vSig;
}

//9 Get a saved query result (view param) and export it as a csv file
function exportViewAsCSV(view) {
  const columns = view[0].columns;
  const rows = view[0].values;

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

// 10 API call to remote SAS to get original signatures file to compare it to the signatures stored in the db facture table

// 11 Renders the result of the comparison in a new card on the HTML page

// 7 Manages actions triggered by event on the select input used to choose the displayed table
document
  .querySelector("#zipFileInput")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (displayVerif(file)) {
      const sqliteFile = (await getFile(file)).dbFile;

      await loadDB(sqliteFile);
      const view = await db.exec(
        `SELECT facture.id, total_ttc, libelle, quantite, total_ht 
        FROM facture 
        INNER JOIN facture_articles 
        ON facture.id = facture_articles.parent`,
      );
      exportViewAsCSV(view);

      const tables = getTablesList();
      displayTables(tables);
    }
  });
