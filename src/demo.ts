import { appearance } from "./index";

console.log(`Current OS theme: ${appearance.current()}`);
console.log("Listening for theme changes... (toggle System Settings → Appearance)");
console.log("Press Ctrl+C to exit.\n");

appearance.on("change", (mode) => {
    console.log(`🔄 Theme changed to: ${mode}`);
});

// Keep the process alive
process.on("SIGINT", () => {
    console.log("\nCleaning up...");
    appearance.dispose();
    process.exit(0);
});
