use std::sync::atomic::{AtomicBool, Ordering};

static RUNNING: AtomicBool = AtomicBool::new(false);

pub fn get_appearance() -> i32 {
    use windows::Win32::System::Registry::*;
    use windows::Win32::Foundation::*;
    use windows::core::*;

    unsafe {
        let mut hkey = HKEY::default();
        let subkey = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize");

        let result = RegOpenKeyExW(HKEY_CURRENT_USER, subkey, 0, KEY_READ, &mut hkey);
        if result != ERROR_SUCCESS {
            return 1; // default to dark
        }

        let mut data: u32 = 1;
        let mut size: u32 = std::mem::size_of::<u32>() as u32;
        let value_name = w!("AppsUseLightTheme");

        let result = RegQueryValueExW(
            hkey,
            value_name,
            None,
            None,
            Some(&mut data as *mut u32 as *mut u8),
            Some(&mut size),
        );

        RegCloseKey(hkey);

        if result == ERROR_SUCCESS {
            if data == 0 { 1 } else { 0 } // 0 = dark mode in registry
        } else {
            1 // default to dark
        }
    }
}

pub fn start_listener() {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(|| {
        use windows::Win32::System::Registry::*;
        use windows::Win32::Foundation::*;
        use windows::core::*;

        unsafe {
            let mut hkey = HKEY::default();
            let subkey = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize");

            let result = RegOpenKeyExW(
                HKEY_CURRENT_USER, subkey, 0,
                KEY_READ | KEY_NOTIFY, &mut hkey,
            );
            if result != ERROR_SUCCESS {
                RUNNING.store(false, Ordering::SeqCst);
                return;
            }

            while RUNNING.load(Ordering::SeqCst) {
                let result = RegNotifyChangeKeyValue(
                    hkey,
                    false,
                    REG_NOTIFY_CHANGE_LAST_SET,
                    HANDLE::default(),
                    false, // synchronous
                );

                if result != ERROR_SUCCESS || !RUNNING.load(Ordering::SeqCst) {
                    break;
                }

                let mode = get_appearance();
                crate::notify_change(mode);
            }

            RegCloseKey(hkey);
        }
    });
}

pub fn stop_listener() {
    RUNNING.store(false, Ordering::SeqCst);
}
