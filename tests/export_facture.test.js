// @vitest-environment happy-dom

import { describe, it, expect, vi } from "vitest";
import { exportFactureCSV } from "./functions/export_facture_csv";
import { downloadfacture } from "./functions/export_facture_dl";
import { facture, articles, reglements, csv } from "./functions/fixtures";

describe("building facture csv", () => {
    it("should structure the csv correctly", () => {
        const result = exportFactureCSV(facture, articles, reglements);

        expect(result.split("\n")).toEqual([
            "data:text/csv;charset=utf-8,ID Facture,Total TTC,Article,Quantité,Prix Unitaire,Total HT,TVA,Règlement,Mode de Paiement,Horodatage",
            "abc, 120,,,,,,,",
            "abc,, article1, 1, 100, 100, 2.00,,",
            "abc,,,,,,, 120, CB, 2026-04-02 09:45:00",
            "",
        ]);
    });

    it("should handle the lack of article", () => {
        const result = exportFactureCSV(facture, [], reglements);
        expect(result.split("\n")).toEqual([
            "data:text/csv;charset=utf-8,ID Facture,Total TTC,Article,Quantité,Prix Unitaire,Total HT,TVA,Règlement,Mode de Paiement,Horodatage",
            "abc, 120,,,,,,,",
            "abc,,,,,,, 120, CB, 2026-04-02 09:45:00",
            "",
        ]);
    });

    it("should handle the lack of reglement", () => {
        const result = exportFactureCSV(facture, articles, []);

        expect(result.split("\n")).toEqual([
            "data:text/csv;charset=utf-8,ID Facture,Total TTC,Article,Quantité,Prix Unitaire,Total HT,TVA,Règlement,Mode de Paiement,Horodatage",
            "abc, 120,,,,,,,",
            "abc,, article1, 1, 100, 100, 2.00,,",
            "",
        ]);
    });

    describe("downloading facture", () => {
        it("should return the encoded URI of the file", () => {
            const createElementSpy = vi.spyOn(document, "createElement");
            const anchorElement = createElementSpy.mock.results;
            const clickSpy = vi.fn();

            HTMLAnchorElement.prototype.click = clickSpy;
            const result = downloadfacture(facture, articles, reglements);

            expect(result).toEqual(encodeURI(csv));
            expect(createElementSpy).toHaveBeenCalled();
            expect(anchorElement).toBeDefined();
            //expect(anchorElement.href).toBeDefined();
            expect(clickSpy).toHaveBeenCalled();
        });
    });
});
