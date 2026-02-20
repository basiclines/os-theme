import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.current()", () => {
    test("returns 'dark' or 'light'", () => {
        const mode = appearance.current();
        expect(["dark", "light"]).toContain(mode);
    });

    test("returns consistent results on consecutive calls", () => {
        const first = appearance.current();
        const second = appearance.current();
        expect(first).toBe(second);
    });
});
