import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.dispose()", () => {
    test("disposes without error", () => {
        expect(() => appearance.dispose()).not.toThrow();
    });

    test("can call dispose multiple times safely", () => {
        appearance.dispose();
        expect(() => appearance.dispose()).not.toThrow();
    });
});
