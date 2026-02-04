/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.merqprime.in'; // Default to Prod Subdomain
        console.log(`[Next.js] Rewriting API calls to: ${apiUrl}`);
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/:path*`, // Proxy to Backend
            },
            {
                source: '/socket.io',
                destination: `${apiUrl}/socket.io/`,
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

