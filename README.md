# os-theme

Cross-platform OS theme detection (dark/light mode) with change notifications for Node.js and Bun.

## Features

- 🌗 Detect current OS theme (`dark` or `light`)
- 📡 Get notified when the theme changes
- 🖥️ Cross-platform — macOS, Windows, Linux
- ⚡ Native Rust core with dual runtime support
- 🟢 **Bun** — direct FFI via `bun:ffi` (zero overhead)
- 🟢 **Node.js** — N-API addon via `napi-rs` (works with tsx, ts-node, etc.)
- 🪶 Zero JS dependencies

## Install

```bash
npm install os-theme
# or
bun add os-theme
```

Prebuilt binaries are provided for macOS (ARM64), Linux (x64), and Windows (x64). No Rust toolchain required.

## Quick Start

```typescript
import { appearance } from "os-theme";

// Read current theme
console.log(await appearance.current()); // "dark" or "light"

// Listen for changes
await appearance.on("change", (mode) => {
  console.log(`Theme changed to: ${mode}`);
});

// Remove a specific listener
await appearance.off("change", myListener);

// Stop all listeners and clean up native resources
await appearance.dispose();
```

## API

### `appearance.current(): Promise<ThemeMode>`

Returns the current OS theme: `"dark"` or `"light"`.

```typescript
const mode = await appearance.current();
```

### `appearance.on(event, listener): Promise<void>`

Subscribe to theme changes. The listener receives the new `ThemeMode` whenever the OS switches between dark and light mode.

```typescript
await appearance.on("change", (mode) => {
  // mode is "dark" or "light"
});
```

### `appearance.off(event, listener): Promise<void>`

Remove a previously registered listener. When no listeners remain, the native watcher is automatically stopped.

```typescript
const listener = (mode: ThemeMode) => console.log(mode);
await appearance.on("change", listener);
// later...
await appearance.off("change", listener);
```

### `appearance.dispose(): Promise<void>`

Stop all listeners and release native resources. Safe to call multiple times. After disposing, `current()` still works (it's a stateless read), but no more change events will fire until `on()` is called again.

```typescript
await appearance.dispose();
```

### Types

```typescript
type ThemeMode = "dark" | "light";

interface Appearance {
  current(): Promise<ThemeMode>;
  on(event: "change", listener: (mode: ThemeMode) => void): Promise<void>;
  off(event: "change", listener: (mode: ThemeMode) => void): Promise<void>;
  dispose(): Promise<void>;
}
```

## Use Cases

### CLI app with Ink/React

```typescript
import { appearance } from "os-theme";
import { useState, useEffect } from "react";

function useOsTheme() {
  const [mode, setMode] = useState<"dark" | "light">("light");

  useEffect(() => {
    appearance.current().then(setMode);
    appearance.on("change", setMode);
    return () => { appearance.off("change", setMode); };
  }, []);

  return mode;
}
```

### Long-running process

```typescript
import { appearance } from "os-theme";

await appearance.on("change", (mode) => {
  regenerateColorPalette(mode);
});

process.on("SIGINT", async () => {
  await appearance.dispose();
  process.exit(0);
});
```

## Platform Details

| Platform | Read mechanism | Listen mechanism |
|----------|---------------|-----------------|
| **macOS** | `defaults read -g AppleInterfaceStyle` | `NSDistributedNotificationCenter` via helper subprocess (event-driven) |
| **Windows** | Registry `AppsUseLightTheme` | `RegNotifyChangeKeyValue` (event-driven) |
| **Linux** | D-Bus `org.freedesktop.portal.Settings` | D-Bus signal subscription (event-driven) |

The native layer is written in Rust and compiled to **two targets**:
- **Bun**: shared library (`.dylib` / `.so` / `.dll`) loaded via [`bun:ffi`](https://bun.sh/docs/runtime/ffi) with threadsafe `JSCallback`
- **Node.js**: N-API addon (`.node`) built with [`napi-rs`](https://napi.rs) using `ThreadsafeFunction`

The runtime is auto-detected — import `os-theme` and it picks the right backend.

### macOS architecture

macOS delivers `AppleInterfaceThemeChangedNotification` only on the **main thread's run loop**, which is owned by the Bun/Node runtime. To work around this, os-theme spawns a lightweight helper binary (`os-theme-helper`, ~51 KB) that:

1. Runs `NSDistributedNotificationCenter` on its own main thread
2. Prints `dark\n` or `light\n` to stdout when the theme changes
3. The Rust library reads from the pipe on a background thread and fires the JS callback
4. Monitors parent PPID on a background thread — exits immediately if the parent process dies (no orphans)

## Architecture

```
┌─────────────────────────────────────┐
│  Your app                           │
│  appearance.on("change", callback)  │
│         │                           │
│         ▼                           │
│  TypeScript API (EventEmitter-like) │
│         │                           │
│         ▼                           │
│  bun:ffi (dlopen + JSCallback)      │
├─────────┼───────────────────────────┤
│         ▼       Native (Rust)       │
│  ┌────────────────────────────────┐ │
│  │ macOS:   helper subprocess     │ │
│  │          + NSDistributed       │ │
│  │          NotificationCenter    │ │
│  │ Windows: Registry + notify     │ │
│  │ Linux:   D-Bus + signal        │ │
│  └────────────────────────────────┘ │
│  Event-driven on all platforms      │
└─────────────────────────────────────┘
        macOS detail:
┌──────────┐  stdout pipe  ┌──────────────┐
│  Rust    │◄──────────────│ os-theme-    │
│  lib     │  stdin pipe   │ helper       │
│  (bg     │──────────────►│ (main thread │
│  thread) │  (death det.) │  run loop)   │
└──────────┘               └──────────────┘
```

## Performance

The listener is fully event-driven — **zero CPU usage while idle**. No polling, no timers, no busy-wait.

### Resource footprint (macOS, Apple Silicon)

| Metric | Value |
|--------|-------|
| Helper binary size | **51 KB** |
| Helper RSS (idle) | **~24 MB** *(macOS framework overhead)* |
| CPU usage (idle) | **0.0%** |
| Event latency | **~250 ms** *(notification → JS callback)* |
| Extra processes | 1 helper subprocess |
| Extra file descriptors | 2 pipes (stdin + stdout) |

### Event-driven vs polling

| | Polling (250ms) | Event-driven (current) |
|---|---|---|
| CPU while idle | Periodic spikes (`defaults read` fork every 250ms) | **0.0%** |
| Worst-case latency | 250 ms | **~250 ms** |
| Process spawns | ~4/second, forever | **1 total** (helper stays alive) |
| Memory overhead | Minimal | +24 MB *(AppKit/Foundation frameworks)* |

The ~24 MB RSS is the fixed cost of loading macOS's `AppKit` + `Foundation` frameworks, required by any process using `NSDistributedNotificationCenter`. It does not grow over time.

### Orphan protection

The helper process monitors its parent via `getppid()` on a background thread (1-second interval). If the parent process exits (gracefully or via crash/SIGKILL), the helper detects PPID reparenting and exits immediately — **no orphaned processes**.

### Run the benchmark yourself

```bash
bun run benchmark
```

This measures binary size, memory, CPU (5-second idle sample), event latency (live toggle), and orphan cleanup. It briefly changes your macOS appearance and restores it afterwards.

<details>
<summary>Example output</summary>

```
╔══════════════════════════════════════════╗
║      os-theme performance benchmark      ║
╚══════════════════════════════════════════╝

📦 Binary sizes
   Native library (dylib):        448K
   Helper binary:                  52K

💾 Memory usage (idle)
   Bun process (RSS):             40224 KB  (39.2 MB)
   Helper process (RSS):          24448 KB  (23.8 MB)

⏱️  CPU usage (5-second idle sample)
   Bun process:                   0.0%
   Helper process:                0.0%

⚡ Event latency (toggle dark → light → restore)
   Dark → callback:              249 ms
   Light → callback:             255 ms
   Average:                      252 ms

🧹 Orphan protection
   ✅ Helper exited cleanly after parent kill
```

</details>

## Development

### Prerequisites

- [Bun](https://bun.sh) (runtime + test runner)
- [Rust](https://rustup.rs) (for compiling native library)

### Setup

```bash
git clone <repo-url>
cd os-theme
bun install
bun run build:native   # compile Rust → .dylib/.so/.dll
```

### Commands

```bash
bun run build:native   # compile native library
bun test               # run all tests (unit + integration)
bun run dev            # interactive demo — toggle your OS theme to see events
bun run benchmark      # measure resource usage and event latency
```

### Testing

The test suite includes both unit and integration tests:

- **Unit tests** — verify API contracts (`current()`, `on()`/`off()`, `dispose()`)
- **Integration test** — programmatically toggles macOS appearance via `osascript`, verifies the callback fires with the correct mode, and restores the original theme

```bash
bun test                          # all tests
bun test test/current.test.ts     # just current() tests
bun test test/integration.test.ts # just the live toggle test
```

> **Note:** The integration test briefly changes your macOS appearance and restores it afterwards.

## Roadmap

- [x] Event-driven macOS listener via `NSDistributedNotificationCenter` (helper subprocess)
- [x] Node.js compatibility via N-API (`napi-rs` addon, works with tsx/ts-node)
- [x] Prebuilt binaries via npm optional dependencies (no Rust needed to install)
- [x] CI/CD with GitHub Actions matrix builds (macOS, Windows, Linux)
- [ ] `bun build --compile` for single-executable distribution

## License

MIT — see [LICENSE](./LICENSE)
