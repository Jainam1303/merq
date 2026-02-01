
const API_BASE = "/api"; // Next.js rewrites handle the proxy to backend

export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
    [key: string]: any;
}

export const fetchJson = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    try {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

        const finalOptions: RequestInit = { cache: 'no-store', ...options };

        // Default headers
        if (!finalOptions.headers) {
            finalOptions.headers = {};
        }

        if (options.body && !(finalOptions.headers as Record<string, string>)['Content-Type']) {
            (finalOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        // Since we are proxying, credentials/cookies handles by browser automatically if same-origin
        // But explicitly safe to add
        finalOptions.credentials = 'include';

        const res = await fetch(url, finalOptions);

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            const text = await res.text();
            console.error("Received non-JSON response:", text.substring(0, 500));
            throw new Error("Server Error: Received HTML instead of JSON.");
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `API Error ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(`Fetch JSON failed for ${endpoint}:`, err);
        throw err;
    }
};
