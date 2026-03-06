import "zip.js";

/*
Etape à réaliser pour vendredi: 

1. Extract zip
2. Load db
3. Get tables
4. Get tables content ?
5. Display tables
6. Display content ?
7. Manage functions in eventListener
*/

const pemEncodedKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAiGWKIYc4VYnreGw+PycFmJFTa2xhyh1GcdwqbTU3l2A=
-----END PUBLIC KEY-----`;

const SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`,
});
let db = "";
const select = document.querySelector("#tabSelect");

//crypto verif

//convert string to binary
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

//import an existing key
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

//Verify the document signature and return true or false
async function verifySig(signature, encodedData) {
  const publicKey = await importRsaKey(pemEncodedKey);

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

//get the sqlite.sig file and convert to an ArrayBuffer
async function getSignature(zipF) {
  const reader = new zip.ZipReader(new zip.BlobReader(zipF));
  const entries = await reader.getEntries();

  for (const entry of entries) {
    if (entry.filename.endsWith(".sqlite.sig")) {
      let signature = await entry.getData(new zip.BlobWriter());
      signature = signature.arrayBuffer();
      await reader.close();
      return signature;
    }
  }

  await reader.close();
  throw new Error("Aucun fichier correspondant.");
}

//convert the sqlite file to an ArrayBuffer
async function convertToArrayBuffer(file) {
  const buffer = await file.arrayBuffer();

  return buffer;
}

//page rendering

// 1 Extract the .sqlite file from the archive return a blob file
async function getFile(zipF) {
  const reader = new zip.ZipReader(new zip.BlobReader(zipF));
  const entries = await reader.getEntries();

  for (const entry of entries) {
    if (entry.filename.endsWith(".sqlite")) {
      const sqliteFile = await entry.getData(new zip.BlobWriter());
      await reader.close();
      return sqliteFile;
    }
  }

  await reader.close();
  throw new Error("Aucun fichier sqlite trouvé.");
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

  console.log(tableList);

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

// 5 Renders a table with the data from one db table
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

// 6 Renders the data to add to the table
function displayContent(tableName) {
  const article = document.querySelector("#tabStructure");

  while (article.firstChild) {
    article.removeChild(article.firstChild);
  }

  const title = document.createElement("h4");
  title.className = "mb-3";
  title.textContent = tableName;
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
function displayVerif(vSig) {
  if (vSig) {
    //green check
  } else {
    //red X
  }
}

// 7 Manages events on the select input used to choose the displayed table
document
  .querySelector("#zipFileInput")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sqliteFile = await getFile(file);
    const signature = await getSignature(file);
    const encodedData = await convertToArrayBuffer(sqliteFile);
    const vSig = await verifySig(signature, encodedData);

    await loadDB(sqliteFile);

    const tables = getTablesList();
    displayTables(tables);
  });
