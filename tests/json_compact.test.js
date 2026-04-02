import { describe, it, expect } from "vitest";
import { jsonCompact } from "./functions/json_compact";

describe("compactJson", () => {
    it("should be the same", () => {
        const obj1 = {
            a: 1,
            b: 2,
            c: [{ d: 4, f: 6, e: 5 }],
        };

        const obj2 = {
            b: 2,
            c: [{ e: 5, d: 4, f: 6 }],
            a: 1,
        };

        expect(jsonCompact(obj1)).toBe(jsonCompact(obj2));
    });
});
