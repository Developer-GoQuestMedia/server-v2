const urlCache = new Map();
const MAX_CACHE_SIZE = 100;

export function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const pad = (num) => String(num).padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, value] of urlCache.entries()) {
        if (now >= value.expiresAt - 30000) {
            urlCache.delete(key);
        }
    }
}

export function enforceMaxCacheSize() {
    if (urlCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(urlCache.entries());
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        while (urlCache.size > MAX_CACHE_SIZE) {
            const [keyToDelete] = entries.shift();
            urlCache.delete(keyToDelete);
        }
    }
}

export function getValidCachedUrl(key) {
    if (urlCache.has(key)) {
        const cached = urlCache.get(key);
        const now = Date.now();
        
        if (now < cached.expiresAt - 30000) {
            return cached;
        }
        urlCache.delete(key);
    }
    return null;
}

export function setCacheUrl(key, url, expiresIn) {
    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000);
    
    urlCache.set(key, {
        url,
        expiresAt,
        createdAt: now
    });
    enforceMaxCacheSize();
}
