import { describe, test, expect } from "bun:test";
import { terminal } from "../src/terminal";

describe("terminal", () => {
    test("terminal object has expected API", () => {
        expect(typeof terminal.current).toBe("function");
        expect(typeof terminal.on).toBe("function");
        expect(typeof terminal.off).toBe("function");
        expect(typeof terminal.dispose).toBe("function");
    });

    test("current() returns ThemeMode or null in non-TTY", async () => {
        const result = await terminal.current();
        // In CI/non-TTY environments, returns null
        // In a real terminal, returns "dark" or "light"
        if (result !== null) {
            expect(["dark", "light"]).toContain(result);
        } else {
            expect(result).toBeNull();
        }
    });

    test("on/off/dispose do not throw in non-TTY", () => {
        const cb = () => {};
        expect(() => terminal.on("change", cb)).not.toThrow();
        expect(() => terminal.off("change", cb)).not.toThrow();
        expect(() => terminal.dispose()).not.toThrow();
    });
});
