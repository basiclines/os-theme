import { join, dirname } from "path";
import { existsSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { ThemeMode } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

const ADDON_NAME = "os-theme-napi";

function getAddonPath(): string {
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const platform = process.platform === "darwin" ? "darwin"
        : process.platform === "win32" ? "win32"
        : "linux";
    const filename = `${ADDON_NAME}.${platform}-${arch}.node`;

    // Development: napi/target/release/
    const devPath = join(__dirname, "..", "native", "target", "release", filename);
    if (existsSync(devPath)) return devPath;

    // Production: bin/
    const prodPath = join(__dirname, "..", "bin", filename);
    if (existsSync(prodPath)) return prodPath;

    throw new Error(
        `os-theme: N-API addon not found (${filename}). ` +
            `Run the napi build to compile it.`
    );
}

interface NapiAddon {
    getAppearance(): number;
    startListener(callback: (err: Error | null, mode: number) => void): void;
    stopListener(): void;
}

let addon: NapiAddon | null = null;

function getAddon(): NapiAddon {
    if (!addon) {
        addon = _require(getAddonPath()) as NapiAddon;
    }
    return addon;
}

export function nativeGetAppearance(): ThemeMode {
    const result = getAddon().getAppearance();
    return result === 1 ? "dark" : "light";
}

export function nativeStartListener(callback: (mode: number) => void): void {
    getAddon().startListener((err, mode) => {
        if (!err) callback(mode);
    });
}

export function nativeStopListener(): void {
    getAddon().stopListener();
}

export function closeLib(): void {
    addon = null;
}
