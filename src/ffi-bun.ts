import { dlopen, FFIType, suffix, JSCallback, type Pointer } from "bun:ffi";
import { join } from "path";
import type { ThemeMode } from "./types";

const IS_WINDOWS = process.platform === "win32";
const NATIVE_LIB_NAME = IS_WINDOWS ? `os_theme.${suffix}` : `libos_theme.${suffix}`;

function findNativeLib(): string {
    // Look in native/target/release/ first (development)
    const devPath = join(import.meta.dir, "..", "native", "target", "release", NATIVE_LIB_NAME);
    if (Bun.file(devPath).size) {
        return devPath;
    }

    // Look next to the source (production/installed)
    const prodPath = join(import.meta.dir, "..", "bin", NATIVE_LIB_NAME);
    if (Bun.file(prodPath).size) {
        return prodPath;
    }

    throw new Error(
        `os-theme: native library not found (${NATIVE_LIB_NAME}). ` +
            `Run 'bun run build:native' to compile it.`
    );
}

interface NativeSymbols {
    get_appearance: () => number;
    start_listener: (ptr: Pointer) => void;
    stop_listener: () => void;
}

interface NativeLib {
    symbols: NativeSymbols;
    close(): void;
}

let lib: NativeLib | null = null;

function getLib(): NativeLib {
    if (!lib) {
        const libPath = findNativeLib();
        lib = dlopen(libPath, {
            get_appearance: {
                args: [],
                returns: FFIType.i32,
            },
            start_listener: {
                args: [FFIType.ptr],
                returns: FFIType.void,
            },
            stop_listener: {
                args: [],
                returns: FFIType.void,
            },
        }) as NativeLib;
    }
    return lib;
}

export function nativeGetAppearance(): ThemeMode {
    const result = getLib().symbols.get_appearance();
    return result === 1 ? "dark" : "light";
}

let activeCallback: JSCallback | null = null;

export function nativeStartListener(callback: (mode: number) => void): void {
    // Clean up any existing callback
    if (activeCallback) {
        activeCallback.close();
    }

    activeCallback = new JSCallback(
        (mode: number) => callback(mode),
        {
            args: [FFIType.i32],
            returns: FFIType.void,
            threadsafe: true, // Rust calls from a different thread
        }
    );

    getLib().symbols.start_listener(activeCallback.ptr!);
}

export function nativeStopListener(): void {
    getLib().symbols.stop_listener();
    if (activeCallback) {
        activeCallback.close();
        activeCallback = null;
    }
}

export function closeLib(): void {
    if (lib) {
        lib.close();
        lib = null;
    }
}
