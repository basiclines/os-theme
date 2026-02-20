#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Build Bun FFI library (cdylib)
cd "$PROJECT_DIR/native"
echo "Building os-theme native library (Bun FFI)..."
cargo build --release
LIB_EXT=$([ "$(uname)" = "Darwin" ] && echo "dylib" || echo "so")
echo "✅ Built: native/target/release/libos_theme.$LIB_EXT"

# Build Node.js N-API addon
cd "$PROJECT_DIR/napi"
echo ""
echo "Building os-theme N-API addon (Node.js)..."
cargo build --release

# Create .node file from dylib
ARCH=$(uname -m)
[ "$ARCH" = "arm64" ] && ARCH_LABEL="arm64" || ARCH_LABEL="x64"
PLATFORM=$([ "$(uname)" = "Darwin" ] && echo "darwin" || echo "linux")
NODE_FILE="os-theme-napi.$PLATFORM-$ARCH_LABEL.node"

cp "$PROJECT_DIR/napi/target/release/libos_theme_napi.$LIB_EXT" \
   "$PROJECT_DIR/native/target/release/$NODE_FILE"

echo "✅ Built: native/target/release/$NODE_FILE"
