
/**
 * Advanced Device Detector
 * Uses User-Agent regex + Client Hints (where available) for precise identification.
 * Can identify Windows 11 vs 10, and specific browsers like 360, Edge, WeChat.
 */
export const detectDevice = async (): Promise<{ os: string; browser: string }> => {
    const ua = navigator.userAgent;
    const nav = navigator as any; // Cast to any to access experimental userAgentData

    let os = '其他系统';
    let browser = '未知浏览器';

    // --- 1. Browser Detection Strategy (Order matters) ---
    // Specific wrappers first
    if (/MicroMessenger/i.test(ua)) {
        browser = '微信内置浏览器';
    } else if (/QQBrowser/i.test(ua)) {
        browser = 'QQ浏览器';
    } else if (/DingTalk/i.test(ua)) {
        browser = '钉钉内置浏览器';
    } 
    // Domestic Browsers (often spoof Chrome)
    else if (/Qihoo/i.test(ua) || /360SE/i.test(ua) || /360EE/i.test(ua)) {
        browser = '360浏览器';
    } else if (/LBBROWSER/i.test(ua)) {
        browser = '猎豹浏览器';
    } else if (/MetaSr/i.test(ua)) {
        browser = '搜狗浏览器';
    } else if (/Maxthon/i.test(ua)) {
        browser = '遨游浏览器';
    } else if (/TheWorld/i.test(ua)) {
        browser = '世界之窗';
    } else if (/UBrowser/i.test(ua)) {
        browser = 'UC浏览器';
    } else if (/2345Explorer/i.test(ua)) {
        browser = '2345浏览器';
    }
    // Major Browsers
    else if (/Edg/i.test(ua)) {
        browser = 'Microsoft Edge';
    } else if (/OPR|Opera/i.test(ua)) {
        browser = 'Opera';
    } else if (/Firefox/i.test(ua)) {
        browser = 'Firefox';
    } else if (/Chrome/i.test(ua)) {
        // 360 Secure Browser sometimes hides in Chrome UA, check specific properties if possible
        // But regex 'Chrome' is the fallback
        browser = 'Chrome';
        // Simple heuristic for 360 (mime-types check is deprecated/blocked, relying on UA quirks if any)
        if (navigator.mimeTypes && navigator.mimeTypes.length > 30) {
             // High mime count is sometimes indicative of plugin-heavy browsers like 360 in older versions
             // But for modern web, we stick to UA safety.
        }
    } else if (/Safari/i.test(ua)) {
        browser = 'Safari';
    } else if (/Trident/i.test(ua) || /MSIE/i.test(ua)) {
        browser = 'Internet Explorer';
    }

    // --- 2. OS Detection Strategy ---
    if (/iPhone|iPad|iPod/i.test(ua)) {
        os = 'iOS';
        const match = ua.match(/OS (\d+)_/);
        if (match) os += ` ${match[1]}`;
    } else if (/Android/i.test(ua)) {
        os = 'Android';
        const match = ua.match(/Android (\d+(\.\d+)?)/);
        if (match) os += ` ${match[1]}`;
    } else if (/Mac/i.test(ua)) {
        os = 'macOS';
        // Regex to find version like 10_15_7
        const match = ua.match(/Mac OS X (\d+)[_.](\d+)/);
        if (match) {
            const major = parseInt(match[1]);
            const minor = parseInt(match[2]);
            if (major === 10) {
                if (minor >= 15) os = 'macOS Catalina';
                else if (minor === 14) os = 'macOS Mojave';
                else os = `macOS 10.${minor}`;
            } else if (major >= 11) {
                os = `macOS ${major}`; // Big Sur, Monterey, Ventura...
            }
        }
    } else if (/Linux/i.test(ua)) {
        os = 'Linux';
    } else if (/Windows/i.test(ua)) {
        os = 'Windows';
        
        // Attempt precise version via Client Hints (Async)
        // This is crucial for distinguishing Windows 10 vs 11
        if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
            try {
                const values = await nav.userAgentData.getHighEntropyValues(['platformVersion']);
                if (values.platformVersion) {
                    const majorVersion = parseInt(values.platformVersion.split('.')[0]);
                    // Windows 11 uses major version 13+ in Client Hints
                    if (majorVersion >= 13) {
                        os = 'Windows 11';
                    } else if (majorVersion > 0) {
                        os = 'Windows 10';
                    }
                }
            } catch (e) {
                // Permission denied or API error, fall back to UA regex
                // Note: UA string for Win11 is still "Windows NT 10.0"
            }
        }

        // Fallback regex if Client Hints failed or unavailable
        if (os === 'Windows') {
            if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11'; // Ambiguous without Client Hints
            else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
            else if (/Windows NT 6.2/i.test(ua)) os = 'Windows 8';
            else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
            else if (/Windows NT 5.1/i.test(ua)) os = 'Windows XP';
        }
    }

    return { os, browser };
};
