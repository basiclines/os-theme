#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#include <stdio.h>

// Compiled as a standalone helper binary — runs on main thread, prints to stdout.
// Exits automatically when parent process dies (stdin closes / PPID becomes 1).

#ifdef HELPER_BINARY

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

static void watchParent(void) {
    // Monitor stdin — when the parent process dies, our stdin pipe breaks.
    // Also check PPID; if reparented to launchd (PID 1), parent is gone.
    dispatch_source_t source = dispatch_source_create(
        DISPATCH_SOURCE_TYPE_READ, STDIN_FILENO, 0,
        dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0));

    dispatch_source_set_event_handler(source, ^{
        // stdin became readable (EOF) → parent died
        _exit(0);
    });
    dispatch_source_set_cancel_handler(source, ^{
        _exit(0);
    });
    dispatch_resume(source);
}

int main() {
    @autoreleasepool {
        watchParent();
        NSApplicationLoad();
        Observer *obs = [[Observer alloc] init];
        [[NSDistributedNotificationCenter defaultCenter]
            addObserver:obs
               selector:@selector(themeChanged:)
                   name:@"AppleInterfaceThemeChangedNotification"
                 object:nil];
        NSRunLoop *rl = [NSRunLoop currentRunLoop];
        [rl addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
        [rl run];
    }
    return 0;
}

#endif
