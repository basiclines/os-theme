use std::sync::atomic::{AtomicBool, Ordering};

static RUNNING: AtomicBool = AtomicBool::new(false);

pub fn get_appearance() -> i32 {
    let conn = match dbus::blocking::Connection::new_session() {
        Ok(c) => c,
        Err(_) => return 1, // default to dark
    };

    let proxy = conn.with_proxy(
        "org.freedesktop.portal.Desktop",
        "/org/freedesktop/portal/desktop",
        std::time::Duration::from_millis(500),
    );

    use dbus::blocking::stdintf::org_freedesktop_dbus::Properties;
    // color-scheme: 0 = no preference, 1 = dark, 2 = light
    let result: Result<dbus::arg::Variant<u32>, _> = proxy.get(
        "org.freedesktop.portal.Settings",
        "color-scheme",
    );

    match result {
        Ok(variant) => {
            if variant.0 == 1 { 1 } else { 0 }
        }
        Err(_) => 1, // default to dark
    }
}

pub fn start_listener() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        let conn = match dbus::blocking::Connection::new_session() {
            Ok(c) => c,
            Err(_) => {
                RUNNING.store(false, Ordering::SeqCst);
                return;
            }
        };

        // Listen for settings changes
        let _match = conn.add_match(
            dbus::message::MatchRule::new_signal(
                "org.freedesktop.portal.Settings",
                "SettingChanged",
            ),
            |_: (), _, msg| {
                // Check if it's the color-scheme setting
                let items: Option<(&str, &str, dbus::arg::Variant<u32>)> = msg.read3().ok();
                if let Some(("org.freedesktop.appearance", "color-scheme", variant)) = items {
                    let mode = if variant.0 == 1 { 1 } else { 0 };
                    crate::notify_change(mode);
                }
                true
            },
        );

        while RUNNING.load(Ordering::SeqCst) {
            let _ = conn.process(std::time::Duration::from_millis(500));
        }
    });
}

pub fn stop_listener() {
    RUNNING.store(false, Ordering::SeqCst);
}
