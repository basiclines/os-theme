import type { Appearance, ThemeMode } from "./types";
import {
    nativeGetAppearance,
    nativeStartListener,
    nativeStopListener,
    closeLib,
} from "./ffi";

export type { ThemeMode, Appearance } from "./types";

class AppearanceImpl implements Appearance {
    private listeners: Set<(mode: ThemeMode) => void> = new Set();
    private listening = false;

    current(): ThemeMode {
        return nativeGetAppearance();
    }

    on(event: "change", listener: (mode: ThemeMode) => void): void {
        if (event !== "change") return;

        this.listeners.add(listener);

        if (!this.listening) {
            this.listening = true;
            nativeStartListener((modeInt: number) => {
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

    off(event: "change", listener: (mode: ThemeMode) => void): void {
        if (event !== "change") return;
        this.listeners.delete(listener);

        if (this.listeners.size === 0 && this.listening) {
            this.listening = false;
            nativeStopListener();
        }
    }

    dispose(): void {
        if (this.listening) {
            this.listening = false;
            nativeStopListener();
        }
        this.listeners.clear();
        closeLib();
    }
}

/** Singleton appearance instance */
export const appearance: Appearance = new AppearanceImpl();
