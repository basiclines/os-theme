#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#include <stdio.h>

// This file is used in TWO ways:
// 1. Linked into the dylib — provides macos_start/stop_theme_observer()
// 2. Compiled as a standalone helper binary — runs on main thread, prints to stdout

#ifdef HELPER_BINARY

// --- Standalone helper mode ---
// Runs on the main thread, prints "dark\n" or "light\n" to stdout on theme change

@interface Observer : NSObject
@end

@implementation Observer
- (void)themeChanged:(NSNotification * __unused)notification {
    NSString *style = [[NSUserDefaults standardUserDefaults]
        stringForKey:@"AppleInterfaceStyle"];
    BOOL isDark = style && [style caseInsensitiveCompare:@"Dark"] == NSOrderedSame;
    printf("%s\n", isDark ? "dark" : "light");
    fflush(stdout);
}
@end

int main() {
    @autoreleasepool {
        NSApplicationLoad();
        Observer *obs = [[Observer alloc] init];
        [[NSDistributedNotificationCenter defaultCenter]
            addObserver:obs
               selector:@selector(themeChanged:)
                   name:@"AppleInterfaceThemeChangedNotification"
                 object:nil];
        // Keep the main run loop alive
        NSRunLoop *rl = [NSRunLoop currentRunLoop];
        [rl addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
        [rl run];
    }
    return 0;
}

#else

// --- Library mode ---
// Spawns the helper binary as a subprocess and reads from its stdout

typedef void (*ThemeCallback)(int mode);

static ThemeCallback g_callback = NULL;

void macos_start_theme_observer(ThemeCallback callback) {
    g_callback = callback;
    // Actual subprocess spawning is done in Rust (macos.rs)
}

void macos_stop_theme_observer(void) {
    g_callback = NULL;
}

#endif
