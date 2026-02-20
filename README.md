# os-theme

Cross-platform OS theme detection (dark/light mode) with change notifications for Node.js and Bun.

## Features

- 🌗 Detect current OS theme (`dark` or `light`)
- 📡 Get notified when the theme changes
- 🖥️ Cross-platform — macOS, Windows, Linux
- ⚡ Native Rust core called via `bun:ffi`
- 🪶 Zero JS dependencies

## Install

```bash
bun add os-theme
```

## Quick Start

```typescript
import { appearance } from "os-theme";

// Read current theme
console.log(appearance.current()); // "dark" or "light"

// Listen for changes
appearance.on("change", (mode) => {
  console.log(`Theme changed to: ${mode}`);
});

// Remove a specific listener
appearance.off("change", myListener);

// Stop all listeners and clean up native resources
appearance.dispose();
```

## API

### `appearance.current(): ThemeMode`

Returns the current OS theme: `"dark"` or `"light"`.

```typescript
const mode = appearance.current();
```

### `appearance.on(event, listener)`

Subscribe to theme changes. The listener receives the new `ThemeMode` whenever the OS switches between dark and light mode.

```typescript
appearance.on("change", (mode) => {
  // mode is "dark" or "light"
});
```

### `appearance.off(event, listener)`

Remove a previously registered listener. When no listeners remain, the native watcher is automatically stopped.

```typescript
const listener = (mode: ThemeMode) => console.log(mode);
appearance.on("change", listener);
// later...
appearance.off("change", listener);
```

### `appearance.dispose()`

Stop all listeners and release native resources. Safe to call multiple times. After disposing, `current()` still works (it's a stateless read), but no more change events will fire until `on()` is called again.

```typescript
appearance.dispose();
```

### Types

```typescript
type ThemeMode = "dark" | "light";

interface Appearance {
  current(): ThemeMode;
  on(event: "change", listener: (mode: ThemeMode) => void): void;
  off(event: "change", listener: (mode: ThemeMode) => void): void;
  dispose(): void;
}
```

## Use Cases

### CLI app with Ink/React

```typescript
import { appearance } from "os-theme";
import { useState, useEffect } from "react";

function useOsTheme() {
  const [mode, setMode] = useState(appearance.current());

  useEffect(() => {
    appearance.on("change", setMode);
    return () => appearance.off("change", setMode);
  }, []);

  return mode;
}
```

### Long-running process

```typescript
import { appearance } from "os-theme";

appearance.on("change", (mode) => {
  regenerateColorPalette(mode);
});

process.on("SIGINT", () => {
  appearance.dispose();
  process.exit(0);
});
```

## Platform Details

| Platform | Read mechanism | Listen mechanism |
|----------|---------------|-----------------|
| **macOS** | `defaults read -g AppleInterfaceStyle` | Polls every 250ms from native thread |
| **Windows** | Registry `AppsUseLightTheme` | `RegNotifyChangeKeyValue` (event-driven) |
| **Linux** | D-Bus `org.freedesktop.portal.Settings` | D-Bus signal subscription (event-driven) |

The native layer is written in Rust and compiled to a shared library (`.dylib` / `.so` / `.dll`), loaded at runtime via [`bun:ffi`](https://bun.sh/docs/runtime/ffi). The JS ↔ Rust callback uses a threadsafe `JSCallback` to safely deliver events from the native watcher thread.

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
│  │ macOS:   defaults read + poll  │ │
│  │ Windows: Registry + notify     │ │
│  │ Linux:   D-Bus + signal        │ │
│  └────────────────────────────────┘ │
│  Runs on a separate native thread   │
└─────────────────────────────────────┘
```

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

- [ ] Event-driven macOS listener via Core Foundation (`CFNotificationCenterAddObserver`)
- [ ] Node.js compatibility (N-API fallback for non-Bun consumers)
- [ ] Prebuilt binaries via npm optional dependencies (no Rust needed to install)
- [ ] CI/CD with GitHub Actions matrix builds (macOS, Windows, Linux)
- [ ] `bun build --compile` for single-executable distribution

## License

MIT — see [LICENSE](./LICENSE)
