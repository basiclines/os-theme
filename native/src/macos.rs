use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

static RUNNING: AtomicBool = AtomicBool::new(false);

/// Read current appearance: 0 = light, 1 = dark
pub fn get_appearance() -> i32 {
    let output = Command::new("defaults")
        .args(["read", "-g", "AppleInterfaceStyle"])
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if stdout.trim().eq_ignore_ascii_case("dark") {
                1
            } else {
                0
            }
        }
        Err(_) => 0, // defaults read fails = light mode
    }
}

/// Start listening for theme changes
/// Uses polling with DistributedNotificationCenter registration for reliable cross-thread delivery
pub fn start_listener() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return; // already running
    }

    thread::spawn(|| {
        let mut last_mode = get_appearance();

        // Poll for changes — distributed notifications require the main thread's
        // run loop which we don't own. Polling every 250ms is reliable and lightweight.
        while RUNNING.load(Ordering::SeqCst) {
            thread::sleep(std::time::Duration::from_millis(250));
            let current = get_appearance();
            if current != last_mode {
                last_mode = current;
                crate::notify_change(current);
            }
        }
    });
}

pub fn stop_listener() {
    RUNNING.store(false, Ordering::SeqCst);
}
