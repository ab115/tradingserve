export const getApiUrl = () => {
    // Smart Detection:
    // If we are on localhost (dev mode), use local backend.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Check if we are running on the Proxy Port (8080)
        if (window.location.port === '8080') {
            return ''; // Relative path (Proxy handles it)
        }
        return 'http://localhost:9001';
    }

    // If we are on ngrok (single domain), return empty string for relative pathing.
    // The proxy will route /ws/ requests to the backend.
    return '';
};

export const getWsUrl = (path: string) => {
    const apiUrl = getApiUrl();

    // If API URL is empty (Relative/Proxy), construct WS URL from window.location
    if (!apiUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.host; // Includes port
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${protocol}${host}${cleanPath}`;
    }

    const protocol = apiUrl.startsWith('https') ? 'wss://' : 'ws://';
    const host = apiUrl.replace(/^https?:\/\//, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}${host}${cleanPath}`;
};
