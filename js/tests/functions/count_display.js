export function countDisplay(data) {
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
