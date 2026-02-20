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

/// Start listening for theme changes via DistributedNotificationCenter
pub fn start_listener() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return; // already running
    }

    thread::spawn(|| {
        use objc2_foundation::{
            NSDistributedNotificationCenter, NSNotification, NSRunLoop, NSDate,
        };
        use block2::RcBlock;
        use std::ptr::NonNull;

        unsafe {
            let center = NSDistributedNotificationCenter::defaultCenter();
            let notification_name = objc2_foundation::NSString::from_str(
                "AppleInterfaceThemeChangedNotification",
            );

            let block = RcBlock::new(|_notif: NonNull<NSNotification>| {
                let mode = get_appearance();
                crate::notify_change(mode);
            });

            center.addObserverForName_object_queue_usingBlock(
                Some(&notification_name),
                None,
                None,
                &block,
            );

            // Run the run loop to receive notifications
            let run_loop = NSRunLoop::currentRunLoop();
            while RUNNING.load(Ordering::SeqCst) {
                let date = NSDate::dateWithTimeIntervalSinceNow(0.5);
                run_loop.runUntilDate(&date);
            }
        }
    });
}

pub fn stop_listener() {
    RUNNING.store(false, Ordering::SeqCst);
}
