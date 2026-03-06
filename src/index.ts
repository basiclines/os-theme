import type { Appearance, ThemeMode } from "./types.js";
import {
    nativeGetAppearance,
    nativeStartListener,
    nativeStopListener,
    closeLib,
} from "./ffi.js";

export type { ThemeMode, Appearance } from "./types.js";
export type { Terminal } from "./terminal.js";
export { terminal } from "./terminal.js";

class AppearanceImpl implements Appearance {
    private listeners: Set<(mode: ThemeMode) => void> = new Set();
    private listening = false;

    async current(): Promise<ThemeMode> {
        return nativeGetAppearance();
    }

    async on(event: "change", listener: (mode: ThemeMode) => void): Promise<void> {
        if (event !== "change") return;

        this.listeners.add(listener);

        if (!this.listening) {
            this.listening = true;
            await nativeStartListener((modeInt: number) => {
                const mode: ThemeMode = modeInt === 1 ? "dark" : "light";
                for (const fn of this.listeners) {
                    try {
                        fn(mode);
                    } catch (_) {
                        // Don't let one listener break others
                    }
                }
            });
        }
    }

    async off(event: "change", listener: (mode: ThemeMode) => void): Promise<void> {
        if (event !== "change") return;
        this.listeners.delete(listener);

        if (this.listeners.size === 0 && this.listening) {
            this.listening = false;
            await nativeStopListener();
        }
    }

    async dispose(): Promise<void> {
        if (this.listening) {
            this.listening = false;
            await nativeStopListener();
        }
        this.listeners.clear();
        await closeLib();
    }
}

/** Singleton appearance instance */
export const appearance: Appearance = new AppearanceImpl();
