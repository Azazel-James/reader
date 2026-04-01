import { describe, it, expect } from "vitest";
import { jsonCompact } from "./functions/json_compact";

describe("compactJson", () => {
    it("should be the same", () => {
        const obj1 = {
            a: 1,
            b: 2,
        };

        const obj2 = {
            b: 2,
            a: 1,
        };

        expect(jsonCompact(obj1)).toBe(jsonCompact(obj2));
    });
});
