import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.on() / appearance.off()", () => {
    test("registers a listener without error", () => {
        const listener = (_mode: string) => {};
        expect(() => appearance.on("change", listener)).not.toThrow();
        appearance.off("change", listener);
    });

    test("removes a listener without error", () => {
        const listener = (_mode: string) => {};
        appearance.on("change", listener);
        expect(() => appearance.off("change", listener)).not.toThrow();
    });

    test("handles multiple on/off cycles without error", () => {
        for (let i = 0; i < 5; i++) {
            const listener = (_mode: string) => {};
            appearance.on("change", listener);
            appearance.off("change", listener);
        }
    });
});
