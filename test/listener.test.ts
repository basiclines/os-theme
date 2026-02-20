import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance.on() / appearance.off()", () => {
    test("registers a listener without error", async () => {
        const listener = (_mode: string) => {};
        await appearance.on("change", listener);
        await appearance.off("change", listener);
    });

    test("removes a listener without error", async () => {
        const listener = (_mode: string) => {};
        await appearance.on("change", listener);
        await appearance.off("change", listener);
    });

    test("handles multiple on/off cycles without error", async () => {
        for (let i = 0; i < 5; i++) {
            const listener = (_mode: string) => {};
            await appearance.on("change", listener);
            await appearance.off("change", listener);
        }
    });
});
