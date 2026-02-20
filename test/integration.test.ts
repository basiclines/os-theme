import { describe, test, expect } from "bun:test";
import { appearance } from "../src/index";

describe("appearance listener (macOS integration)", () => {
    test("fires callback when OS theme changes", async () => {
        // Get initial state
        const initial = await appearance.current();
        const targetMode = initial === "dark" ? "light" : "dark";

        // Set up listener and wait for callback
        const result = await new Promise<string>(async (resolve, reject) => {
            const timeout = setTimeout(async () => {
                await appearance.off("change", listener);
                reject(new Error("Listener did not fire within 5 seconds"));
            }, 5_000);

            const listener = async (mode: string) => {
                clearTimeout(timeout);
                await appearance.off("change", listener);
                resolve(mode);
            };

            await appearance.on("change", listener);

            // Give the native listener thread time to start and attach to the run loop
            setTimeout(async () => {
                // Toggle macOS appearance via AppleScript
                const toggle = Bun.spawn([
                    "osascript",
                    "-e",
                    `tell application "System Events" to tell appearance preferences to set dark mode to ${targetMode === "dark"}`,
                ]);
                const code = await toggle.exited;
                if (code !== 0) {
                    clearTimeout(timeout);
                    reject(new Error(`osascript failed with code ${code}`));
                }
            }, 1_000);
        });

        expect(result).toBe(targetMode);

        // Restore original appearance
        await Bun.spawn([
            "osascript",
            "-e",
            `tell application "System Events" to tell appearance preferences to set dark mode to ${initial === "dark"}`,
        ]).exited;

        // Verify it's back
        await Bun.sleep(500);
        const restored = await appearance.current();
        expect(restored).toBe(initial);
    }, 10_000);
});
