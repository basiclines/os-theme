export type ThemeMode = "dark" | "light";

export interface AppearanceEvents {
    change: (mode: ThemeMode) => void;
}

export interface Appearance {
    /** Get the current OS theme mode */
    current(): Promise<ThemeMode>;

    /** Listen for theme changes */
    on(event: "change", listener: (mode: ThemeMode) => void): Promise<void>;

    /** Remove a specific listener */
    off(event: "change", listener: (mode: ThemeMode) => void): Promise<void>;

    /** Stop listening for changes and clean up native resources */
    dispose(): Promise<void>;
}
