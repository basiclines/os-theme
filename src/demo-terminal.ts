import { terminal } from "./terminal";

console.log("Querying terminal theme via OSC 11...");
const theme = await terminal.current();
console.log(`Terminal theme: ${theme ?? "unknown (not a TTY or unsupported)"}`);

console.log("\nListening for terminal theme changes via Mode 2031...");
console.log("(Change your terminal theme to see events. Press Ctrl+C to exit)\n");

terminal.on("change", (mode) => {
    console.log(`Terminal theme changed: ${mode}`);
});

process.on("SIGINT", () => {
    terminal.dispose();
    process.exit(0);
});
