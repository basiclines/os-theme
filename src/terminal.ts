import type { ThemeMode } from "./types";

export interface Terminal {
    /** Get the current terminal theme by querying background color via OSC 11 */
    current(): Promise<ThemeMode | null>;

    /** Listen for terminal theme changes via Mode 2031 (event-driven, no polling) */
    on(event: "change", listener: (mode: ThemeMode) => void): void;

    /** Remove a specific listener */
    off(event: "change", listener: (mode: ThemeMode) => void): void;

    /** Stop listening and clean up */
    dispose(): void;
}

const ESC = "\x1b";
const BEL = "\x07";

// Mode 2031: enable/disable terminal theme change notifications
const MODE_2031_ENABLE = `${ESC}[?2031h`;
const MODE_2031_DISABLE = `${ESC}[?2031l`;

// OSC 11: query terminal background color
const OSC_11_QUERY = `${ESC}]11;?${BEL}`;

// Mode 2031 response pattern: ESC [ ? 997 ; {1=dark, 2=light} n
const MODE_2031_REGEX = /\x1b\[\?997;([12])n/;

// OSC 11 response pattern: ESC ] 11 ; rgb:RRRR/GGGG/BBBB (terminated by BEL or ST)
const OSC_11_REGEX = /\x1b\]11;rgb:([0-9a-fA-F]+)\/([0-9a-fA-F]+)\/([0-9a-fA-F]+)/;

/**
 * Parse luminance from RGB hex values (each 1-4 hex digits, representing 8-16 bit color).
 * Returns a value between 0 (black) and 1 (white).
 */
function rgbLuminance(rHex: string, gHex: string, bHex: string): number {
    // Normalize to 0-1 range regardless of hex digit count
    const maxVal = (1 << (rHex.length * 4)) - 1;
    const r = parseInt(rHex, 16) / maxVal;
    const g = parseInt(gHex, 16) / maxVal;
    const b = parseInt(bHex, 16) / maxVal;

    // Relative luminance (ITU-R BT.709)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

class TerminalImpl implements Terminal {
    private listeners: Set<(mode: ThemeMode) => void> = new Set();
    private stdinHandler: ((data: Buffer) => void) | null = null;
    private wasRaw = false;
    private mode2031Supported: boolean | null = null;
    private probeTimeout: ReturnType<typeof setTimeout> | null = null;

    async current(): Promise<ThemeMode | null> {
        if (!process.stdin.isTTY || !process.stdout.isTTY) return null;

        return new Promise<ThemeMode | null>((resolve) => {
            const timeout = setTimeout(() => {
                cleanup();
                resolve(null);
            }, 500);

            const wasRaw = process.stdin.isRaw;
            process.stdin.setRawMode(true);
            process.stdin.resume();

            const onData = (data: Buffer) => {
                const str = data.toString();
                const match = str.match(OSC_11_REGEX);
                if (match) {
                    cleanup();
                    const lum = rgbLuminance(match[1]!, match[2]!, match[3]!);
                    resolve(lum < 0.5 ? "dark" : "light");
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                process.stdin.off("data", onData);
                process.stdin.setRawMode(wasRaw);
                if (!wasRaw) process.stdin.pause();
            };

            process.stdin.on("data", onData);
            process.stdout.write(OSC_11_QUERY);
        });
    }

    on(event: "change", listener: (mode: ThemeMode) => void): void {
        if (event !== "change") return;
        if (!process.stdin.isTTY || !process.stdout.isTTY) return;

        this.listeners.add(listener);

        if (!this.stdinHandler) {
            this.wasRaw = process.stdin.isRaw;
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.unref();

            this.stdinHandler = (data: Buffer) => {
                const str = data.toString();

                // Check for Mode 2031 probe response (DECRPM: CSI ? 2031 ; Ps $ y)
                // Ps=1 means set (supported), Ps=2 means reset, anything else = unsupported
                if (this.mode2031Supported === null) {
                    const decrpm = str.match(/\x1b\[\?2031;(\d)\$y/);
                    if (decrpm) {
                        this.mode2031Supported = decrpm[1] === "1" || decrpm[1] === "2";
                        if (this.probeTimeout) {
                            clearTimeout(this.probeTimeout);
                            this.probeTimeout = null;
                        }
                        if (!this.mode2031Supported) {
                            this.emitFallbackWarning();
                        }
                        return;
                    }
                }

                const match = str.match(MODE_2031_REGEX);
                if (match) {
                    // If we were still probing, the terminal clearly supports it
                    if (this.mode2031Supported === null) {
                        this.mode2031Supported = true;
                        if (this.probeTimeout) {
                            clearTimeout(this.probeTimeout);
                            this.probeTimeout = null;
                        }
                    }
                    const mode: ThemeMode = match[1] === "1" ? "dark" : "light";
                    for (const fn of this.listeners) {
                        try {
                            fn(mode);
                        } catch (_) {
                            // Don't let one listener break others
                        }
                    }
                }
            };

            process.stdin.on("data", this.stdinHandler);
            process.stdout.write(MODE_2031_ENABLE);

            // Query Mode 2031 support via DECRQM (Device Control Request Mode)
            process.stdout.write(`${ESC}[?2031$p`);

            // If no DECRPM response within 200ms, terminal doesn't support Mode 2031
            this.probeTimeout = setTimeout(() => {
                this.probeTimeout = null;
                if (this.mode2031Supported === null) {
                    this.mode2031Supported = false;
                    this.emitFallbackWarning();
                }
            }, 200);
        }
    }

    off(event: "change", listener: (mode: ThemeMode) => void): void {
        if (event !== "change") return;
        this.listeners.delete(listener);

        if (this.listeners.size === 0) {
            this.dispose();
        }
    }

    dispose(): void {
        if (this.probeTimeout) {
            clearTimeout(this.probeTimeout);
            this.probeTimeout = null;
        }
        if (this.stdinHandler) {
            process.stdout.write(MODE_2031_DISABLE);
            process.stdin.off("data", this.stdinHandler);
            process.stdin.setRawMode(this.wasRaw);
            if (!this.wasRaw) process.stdin.pause();
            this.stdinHandler = null;
        }
        this.listeners.clear();
        this.mode2031Supported = null;
    }

    private emitFallbackWarning(): void {
        console.warn(
            "[os-theme] Terminal does not support Mode 2031 (theme change notifications).\n" +
            "           terminal.on(\"change\") will not fire in this terminal.\n" +
            "           Use appearance.on(\"change\") for OS-level theme detection instead."
        );
    }
}

/** Singleton terminal theme instance */
export const terminal: Terminal = new TerminalImpl();
