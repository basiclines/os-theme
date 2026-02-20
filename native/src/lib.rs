#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "linux")]
mod linux;

use std::sync::Mutex;

type ThemeCallback = extern "C" fn(i32);

static CALLBACK: Mutex<Option<ThemeCallback>> = Mutex::new(None);

/// Returns 0 for light, 1 for dark
#[no_mangle]
pub extern "C" fn get_appearance() -> i32 {
    #[cfg(target_os = "macos")]
    return macos::get_appearance();

    #[cfg(target_os = "windows")]
    return windows::get_appearance();

    #[cfg(target_os = "linux")]
    return linux::get_appearance();

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return 1; // default to dark
}

#[no_mangle]
pub extern "C" fn start_listener(callback: ThemeCallback) {
    {
        let mut cb = CALLBACK.lock().unwrap();
        *cb = Some(callback);
    }

    #[cfg(target_os = "macos")]
    macos::start_listener();

    #[cfg(target_os = "windows")]
    windows::start_listener();

    #[cfg(target_os = "linux")]
    linux::start_listener();
}

#[no_mangle]
pub extern "C" fn stop_listener() {
    #[cfg(target_os = "macos")]
    macos::stop_listener();

    #[cfg(target_os = "windows")]
    windows::stop_listener();

    #[cfg(target_os = "linux")]
    linux::stop_listener();

    let mut cb = CALLBACK.lock().unwrap();
    *cb = None;
}

pub(crate) fn notify_change(mode: i32) {
    let cb = CALLBACK.lock().unwrap();
    if let Some(callback) = *cb {
        callback(mode);
    }
}
