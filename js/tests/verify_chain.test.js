import { expect, describe, it } from "vitest";
import { verifyChain } from "./functions/verify_chain";

describe("verifyChain", () => {
    it("should return true as the chain is not broken", () => {
        const input = [
            {
                data: {
                    previous_signature: "abc",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 12",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 0,
                },
                signature: "def",
            },
            {
                data: {
                    previous_signature: "def",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 13",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 1,
                },
                signature: "klm",
            },
            {
                data: {
                    previous_signature: "klm",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 14",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 2,
                },
                signature: "nop",
            },
        ];

        const result = verifyChain(input);

        expect(result).toEqual(true);
    });

    it("should return false as the chain is broken", () => {
        const input = [
            {
                data: {
                    previous_signature: "abc",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 12",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 1,
                },
                signature: "def",
            },
            {
                data: {
                    previous_signature: "def",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 13",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 0,
                },
                signature: "klm",
            },
            {
                data: {
                    previous_signature: "klm",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 14",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 2,
                },
                signature: "nop",
            },
        ];

        const result = verifyChain(input);

        expect(result).toEqual(false);
    });

    it("should return false as 2 elements haves the same sequence id", () => {
        const input = [
            {
                data: {
                    previous_signature: "abc",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 12",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 0,
                },
                signature: "def",
            },
            {
                data: {
                    previous_signature: "def",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 13",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 1,
                },
                signature: "klm",
            },
            {
                data: {
                    previous_signature: "klm",
                    sas_data: {
                        doctype: "facture",
                        name: "facture 14",
                    },
                    sas_data_type: "ghij",
                    sas_sequence_id: 1,
                },
                signature: "nop",
            },
        ];

        const result = verifyChain(input);

        expect(result).toEqual(false);
    });
});
