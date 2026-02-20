#!/usr/bin/env bash
# scripts/benchmark.sh — Measure os-theme resource usage and event latency
#
# Usage: bun run benchmark
#        ./scripts/benchmark.sh
#
# Requires: macOS (uses osascript to toggle appearance)
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "⚠️  This benchmark only runs on macOS"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
HELPER="$PROJECT_DIR/native/target/release/os-theme-helper"

if [[ ! -f "$HELPER" ]]; then
  echo "⚠️  Helper binary not found. Run: bun run build:native"
  exit 1
fi

echo "╔══════════════════════════════════════════╗"
echo "║      os-theme performance benchmark      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Save current theme to restore later
ORIGINAL_MODE=$( defaults read -g AppleInterfaceStyle 2>/dev/null && echo dark || echo light )
if [[ "$ORIGINAL_MODE" == *"Dark"* ]]; then ORIGINAL_MODE="dark"; else ORIGINAL_MODE="light"; fi

cleanup() {
  # Kill demo if still running
  if [[ -n "${DEMO_PID:-}" ]] && kill -0 "$DEMO_PID" 2>/dev/null; then
    kill "$DEMO_PID" 2>/dev/null || true
    wait "$DEMO_PID" 2>/dev/null || true
  fi
  # Restore original theme
  if [[ "$ORIGINAL_MODE" == "dark" ]]; then
    osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true' 2>/dev/null
  else
    osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to false' 2>/dev/null
  fi
}
trap cleanup EXIT

# ── 1. Binary size ──────────────────────────────────────
echo "📦 Binary sizes"
DYLIB="$PROJECT_DIR/native/target/release/libos_theme.dylib"
printf "   %-30s %s\n" "Native library (dylib):" "$(du -h "$DYLIB" | cut -f1 | xargs)"
printf "   %-30s %s\n" "Helper binary:" "$(du -h "$HELPER" | cut -f1 | xargs)"
echo ""

# ── 2. Start the demo and measure ──────────────────────
echo "🚀 Starting os-theme listener..."
cd "$PROJECT_DIR"
bun run src/demo.ts > /tmp/os-theme-bench.log 2>&1 &
DEMO_PID=$!
sleep 2

HELPER_PID=$(pgrep -n -f os-theme-helper 2>/dev/null || echo "")
if [[ -z "$HELPER_PID" ]]; then
  echo "   ⚠️  Helper process not found"
  exit 1
fi

# ── 3. Memory usage ────────────────────────────────────
echo ""
echo "💾 Memory usage (idle)"
BUN_RSS=$(ps -o rss= -p "$DEMO_PID" 2>/dev/null | xargs)
HELPER_RSS=$(ps -o rss= -p "$HELPER_PID" 2>/dev/null | xargs)
printf "   %-30s %s KB  (%s MB)\n" "Bun process (RSS):" "$BUN_RSS" "$(echo "scale=1; $BUN_RSS / 1024" | bc)"
printf "   %-30s %s KB  (%s MB)\n" "Helper process (RSS):" "$HELPER_RSS" "$(echo "scale=1; $HELPER_RSS / 1024" | bc)"
printf "   %-30s %s KB  (%s MB)\n" "Total overhead:" "$(( BUN_RSS + HELPER_RSS ))" "$(echo "scale=1; ($BUN_RSS + $HELPER_RSS) / 1024" | bc)"
echo ""

# ── 4. CPU usage (idle) ────────────────────────────────
echo "⏱️  CPU usage (5-second idle sample)"
CPU_BEFORE_BUN=$(ps -o %cpu= -p "$DEMO_PID" 2>/dev/null | xargs)
CPU_BEFORE_HELPER=$(ps -o %cpu= -p "$HELPER_PID" 2>/dev/null | xargs)
sleep 5
CPU_AFTER_BUN=$(ps -o %cpu= -p "$DEMO_PID" 2>/dev/null | xargs)
CPU_AFTER_HELPER=$(ps -o %cpu= -p "$HELPER_PID" 2>/dev/null | xargs)
printf "   %-30s %s%%\n" "Bun process:" "$CPU_AFTER_BUN"
printf "   %-30s %s%%\n" "Helper process:" "$CPU_AFTER_HELPER"
echo ""

# ── 5. Event latency ───────────────────────────────────
echo "⚡ Event latency (toggle dark → light → restore)"

# Ensure we start from light
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to false' 2>/dev/null
sleep 1

# Clear log
> /tmp/os-theme-bench.log

# Toggle to dark and measure
T_START=$(python3 -c 'import time; print(int(time.time()*1000))')
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true' 2>/dev/null

# Wait for callback (up to 5s)
for i in $(seq 1 50); do
  if grep -q "dark" /tmp/os-theme-bench.log 2>/dev/null; then
    T_END=$(python3 -c 'import time; print(int(time.time()*1000))')
    LATENCY_DARK=$(( T_END - T_START ))
    break
  fi
  sleep 0.1
done

sleep 1

# Toggle to light
> /tmp/os-theme-bench.log
T_START=$(python3 -c 'import time; print(int(time.time()*1000))')
osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to false' 2>/dev/null

for i in $(seq 1 50); do
  if grep -q "light" /tmp/os-theme-bench.log 2>/dev/null; then
    T_END=$(python3 -c 'import time; print(int(time.time()*1000))')
    LATENCY_LIGHT=$(( T_END - T_START ))
    break
  fi
  sleep 0.1
done

printf "   %-30s %s ms\n" "Dark → callback:" "${LATENCY_DARK:-timeout}"
printf "   %-30s %s ms\n" "Light → callback:" "${LATENCY_LIGHT:-timeout}"
if [[ -n "${LATENCY_DARK:-}" && -n "${LATENCY_LIGHT:-}" ]]; then
  AVG=$(( (LATENCY_DARK + LATENCY_LIGHT) / 2 ))
  printf "   %-30s %s ms\n" "Average:" "$AVG"
fi
echo ""

# ── 6. Cleanup check ───────────────────────────────────
echo "🧹 Orphan protection"
kill "$DEMO_PID" 2>/dev/null || true
wait "$DEMO_PID" 2>/dev/null || true

# Give the helper time to detect the broken pipe and exit
ORPHAN_CHECK_PASS=false
for i in $(seq 1 10); do
  if ! pgrep -f os-theme-helper > /dev/null 2>&1; then
    ORPHAN_CHECK_PASS=true
    break
  fi
  sleep 0.5
done

if $ORPHAN_CHECK_PASS; then
  echo "   ✅ Helper exited cleanly after parent kill"
else
  echo "   ⚠️  Helper still running after 5s (orphan leaked)"
fi

# Unset so cleanup trap doesn't try to kill again
unset DEMO_PID

echo ""
echo "── Benchmark complete ──"
rm -f /tmp/os-theme-bench.log
