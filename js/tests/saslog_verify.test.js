import { describe, expect, vi, afterEach, it } from "vitest";
import { logData, saslogVerify } from "./functions/saslog_verify";

afterEach(() => {
    vi.clearAllMocks();
});
describe("saslogVerify", () => {
    it("should fetch data successfully from API", async () => {
        const mockResponse = {
            found: ["sig_1", "sig_3"],
            missing: ["sig_2"],
        };

        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockResponse),
            })
        );
        const payload = ["sig_1", "sig_2", "sig_3"];

        await expect(saslogVerify(payload)).resolves.toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith("https://saslog.dokos.cloud/saslog/v1/verifyMany", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    });

    it("should handle fetch failure", async () => {
        global.fetch = vi.fn(() => Promise.reject("API is down"));

        await expect(saslogVerify()).rejects.toEqual("API is down");
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
