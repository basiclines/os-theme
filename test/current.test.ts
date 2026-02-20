import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.current()", () => {
    test("returns 'dark' or 'light'", async () => {
        const mode = await appearance.current();
        expect(["dark", "light"]).toContain(mode);
    });

    test("returns consistent results on consecutive calls", async () => {
        const first = await appearance.current();
        const second = await appearance.current();
        expect(first).toBe(second);
    });
});
