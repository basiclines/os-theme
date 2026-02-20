import { appearance } from "./index";

async function main() {
    const current = await appearance.current();
    console.log(`Current OS theme: ${current}`);
    console.log("Listening for theme changes... (toggle System Settings → Appearance)");
    console.log("Press Ctrl+C to exit.\n");

    await appearance.on("change", (mode) => {
        console.log(`🔄 Theme changed to: ${mode}`);
    });

    // Keep the event loop alive while listening
    const keepAlive = setInterval(() => {}, 1_000_000);

    process.on("SIGINT", async () => {
        console.log("\nCleaning up...");
        clearInterval(keepAlive);
        await appearance.dispose();
        process.exit(0);
    });
}

main();
