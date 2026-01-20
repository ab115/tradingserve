export const getApiUrl = () => {
    // Smart Detection:
    // If we are on localhost (dev mode) AND 9001 is reachable, might use backend directly.
    // But for Docker Deployment, we assume Nginx Proxy.

    // If running in Vite Dev Mode (port 3000/3001) without Proxy, hardcode.
    // But since we are deploying via Docker, we want Relative Path.

    // Simplification: Always use relative path for production (Docker)
    // The build injects environment variables, OR we detect.

    // If accessed via Port 80 (Portal) or Ngrok, always use relative /marketdata/api
    return '/marketdata/api';
};

export const getWsUrl = (path: string) => {
    // Construct WS URL relative to current host
    // Goal: wss://host/marketdata/ws/...

    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.host; // Includes port

    // path comes in as '/ws/metrics' usually
    // We want /marketdata/ws/metrics

    // If path starts with /ws/, prepend /marketdata
    // If path starts with /, prepend /marketdata

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}${host}/marketdata${cleanPath}`;
};
