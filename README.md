# os-theme

Cross-platform OS theme detection (dark/light mode) with event-driven change notifications for Node.js and Bun.

## Features

- 🌗 Detect current OS theme (dark/light)
- 📡 Event-driven — get notified instantly when the theme changes
- 🖥️ Cross-platform — macOS, Windows, Linux
- ⚡ Native performance via Rust + FFI (no polling)
- 🪶 Zero JS dependencies

## Install

```bash
bun add os-theme
```

## Usage

```typescript
import { appearance } from 'os-theme';

// Read current theme
const mode = appearance.current(); // 'dark' | 'light'

// Listen for changes
appearance.on('change', (mode) => {
  console.log(`Theme changed to: ${mode}`);
});

// Stop listening
appearance.dispose();
```

## How it works

| Platform | Read | Listen |
|----------|------|--------|
| **macOS** | `defaults read -g AppleInterfaceStyle` | `AppleInterfaceThemeChangedNotification` |
| **Windows** | Registry `AppsUseLightTheme` | `RegNotifyChangeKeyValue` |
| **Linux** | D-Bus `org.freedesktop.portal.Settings` | D-Bus signal subscription |

Native code is written in Rust and compiled to a shared library (`.dylib`/`.so`/`.dll`), called from JS via `bun:ffi`.

## Development

```bash
# Build native library
bun run build:native

# Run tests
bun test

# Run demo (interactive)
bun run dev
```

## License

MIT
