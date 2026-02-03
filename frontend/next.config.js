/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        const apiUrl = 'http://3.110.30.136:5000'; // Hardcoded for immediate fix
        console.log(`[Next.js] Rewriting API calls to: ${apiUrl}`);
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/:path*`, // Proxy to Backend
            },
            {
                source: '/socket.io/:path*',
                destination: `${apiUrl}/socket.io/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

