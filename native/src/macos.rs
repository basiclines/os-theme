use std::process::{Command, Child, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::io::BufRead;

static RUNNING: AtomicBool = AtomicBool::new(false);
static CHILD: Mutex<Option<Child>> = Mutex::new(None);

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
        Err(_) => 0,
    }
}

/// Find the helper binary path (next to the dylib)
fn helper_path() -> Option<std::path::PathBuf> {
    // The helper is compiled alongside the dylib
    let lib_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("target")
        .join("release")
        .join("os-theme-helper");
    if lib_path.exists() {
        return Some(lib_path);
    }
    // Also check next to the running library
    None
}

pub fn start_listener() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    let helper = match helper_path() {
        Some(p) => p,
        None => {
            eprintln!("os-theme: helper binary not found, falling back to polling");
            // Fall back to polling
            thread::spawn(|| {
                let mut last = get_appearance();
                while RUNNING.load(Ordering::SeqCst) {
                    thread::sleep(std::time::Duration::from_millis(500));
                    let current = get_appearance();
                    if current != last {
                        last = current;
                        crate::notify_change(current);
                    }
                }
            });
            return;
        }
    };

    // Spawn the helper process (stdin piped so it detects parent death)
    let mut child = match Command::new(&helper)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("os-theme: failed to spawn helper: {}", e);
            return;
        }
    };

    let stdout = child.stdout.take().unwrap();
    {
        let mut child_lock = CHILD.lock().unwrap();
        *child_lock = Some(child);
    }

    // Read from helper's stdout on a background thread
    thread::spawn(move || {
        let reader = std::io::BufReader::new(stdout);
        for line in reader.lines() {
            if !RUNNING.load(Ordering::SeqCst) {
                break;
            }
            if let Ok(line) = line {
                let mode = if line.trim() == "dark" { 1 } else { 0 };
                crate::notify_change(mode);
            }
        }
    });
}

pub fn stop_listener() {
    if !RUNNING.swap(false, Ordering::SeqCst) {
        return;
    }
    let mut child_lock = CHILD.lock().unwrap();
    if let Some(ref mut child) = *child_lock {
        let _ = child.kill();
        let _ = child.wait();
    }
    *child_lock = None;
}
