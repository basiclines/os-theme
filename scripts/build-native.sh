#!/bin/bash
set -e

cd "$(dirname "$0")/../native"

echo "Building os-theme native library..."
cargo build --release

echo ""
echo "✅ Built: native/target/release/libos_theme.$([ "$(uname)" = "Darwin" ] && echo "dylib" || echo "so")"
