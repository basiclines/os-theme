// Runtime detection: use bun:ffi when running in Bun, N-API addon otherwise
import type { ThemeMode } from "./types";

const isBun = typeof globalThis.Bun !== "undefined";

let _backend: typeof import("./ffi-bun") | typeof import("./ffi-napi") | null = null;

async function getBackend() {
    if (!_backend) {
        _backend = isBun
            ? await import("./ffi-bun")
            : await import("./ffi-napi");
    }
    return _backend;
}

// Eagerly load the backend at module init
const backendReady = getBackend();

export async function nativeGetAppearance(): Promise<ThemeMode> {
    const b = await backendReady;
    return b.nativeGetAppearance();
}

export async function nativeStartListener(callback: (mode: number) => void): Promise<void> {
    const b = await backendReady;
    b.nativeStartListener(callback);
}

export async function nativeStopListener(): Promise<void> {
    const b = await backendReady;
    b.nativeStopListener();
}

export async function closeLib(): Promise<void> {
    const b = await backendReady;
    b.closeLib();
}
