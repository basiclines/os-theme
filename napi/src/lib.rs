#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "linux")]
mod linux;

use std::sync::Mutex;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadSafeCallContext, ErrorStrategy};

type ThemeCallback = extern "C" fn(i32);

static CALLBACK: Mutex<Option<ThemeCallback>> = Mutex::new(None);

// Threadsafe function for calling back into JS from native thread
static TSFN: Mutex<Option<ThreadsafeFunction<i32, ErrorStrategy::CalleeHandled>>> = Mutex::new(None);

pub(crate) fn notify_change(mode: i32) {
    // Call the C callback (used internally by platform modules)
    let cb = CALLBACK.lock().unwrap();
    if let Some(callback) = *cb {
        callback(mode);
    }
    drop(cb);

    // Call the JS threadsafe function
    let tsfn = TSFN.lock().unwrap();
    if let Some(ref func) = *tsfn {
        func.call(Ok(mode), napi::threadsafe_function::ThreadsafeFunctionCallMode::NonBlocking);
    }
}

#[napi]
fn get_appearance() -> i32 {
    #[cfg(target_os = "macos")]
    return macos::get_appearance();

    #[cfg(target_os = "windows")]
    return windows::get_appearance();

    #[cfg(target_os = "linux")]
    return linux::get_appearance();

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return 1;
}

#[napi(ts_args_type = "callback: (err: null | Error, mode: number) => void")]
fn start_listener(callback: JsFunction) -> Result<()> {
    let tsfn: ThreadsafeFunction<i32, ErrorStrategy::CalleeHandled> =
        callback.create_threadsafe_function(0, |ctx: ThreadSafeCallContext<i32>| {
            Ok(vec![ctx.env.create_int32(ctx.value)?])
        })?;

    {
        let mut func = TSFN.lock().unwrap();
        *func = Some(tsfn);
    }

    #[cfg(target_os = "macos")]
    macos::start_listener();

    #[cfg(target_os = "windows")]
    windows::start_listener();

    #[cfg(target_os = "linux")]
    linux::start_listener();

    Ok(())
}

#[napi]
fn stop_listener() {
    #[cfg(target_os = "macos")]
    macos::stop_listener();

    #[cfg(target_os = "windows")]
    windows::stop_listener();

    #[cfg(target_os = "linux")]
    linux::stop_listener();

    let mut func = TSFN.lock().unwrap();
    *func = None;

    let mut cb = CALLBACK.lock().unwrap();
    *cb = None;
}
