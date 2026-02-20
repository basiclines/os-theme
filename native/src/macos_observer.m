#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#include <stdio.h>
#include <unistd.h>

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

#include <pthread.h>

static void *parentWatchThread(void *arg) {
    pid_t originalPPID = (pid_t)(intptr_t)arg;
    while (1) {
        sleep(1);
        if (getppid() != originalPPID) {
            _exit(0);
        }
    }
    return NULL;
}

static void watchParent(void) {
    pid_t ppid = getppid();
    pthread_t thread;
    pthread_create(&thread, NULL, parentWatchThread, (void *)(intptr_t)ppid);
    pthread_detach(thread);
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
