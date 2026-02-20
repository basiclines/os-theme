fn main() {
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-lib=framework=CoreFoundation");
        println!("cargo:rustc-link-lib=framework=AppKit");

        // Compile the helper binary (runs on main thread, prints theme changes to stdout)
        let out_dir = std::path::PathBuf::from(
            std::env::var("CARGO_MANIFEST_DIR").unwrap()
        ).join("target").join("release");
        std::fs::create_dir_all(&out_dir).ok();

        let status = std::process::Command::new("clang")
            .args([
                "-fobjc-arc",
                "-DHELPER_BINARY",
                "-framework", "Foundation",
                "-framework", "AppKit",
                "-o", out_dir.join("os-theme-helper").to_str().unwrap(),
                "src/macos_observer.m",
            ])
            .status()
            .expect("Failed to compile helper binary");

        assert!(status.success(), "Helper binary compilation failed");
        println!("cargo:rerun-if-changed=src/macos_observer.m");
    }
}
