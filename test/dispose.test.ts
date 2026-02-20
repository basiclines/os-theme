import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.dispose()", () => {
    test("disposes without error", async () => {
        await appearance.dispose();
    });

    test("can call dispose multiple times safely", async () => {
        await appearance.dispose();
        await appearance.dispose();
    });
});
