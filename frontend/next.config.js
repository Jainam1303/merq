/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3002/:path*',
            },
            {
                source: '/socket.io',
                destination: 'http://localhost:3002/socket.io',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://localhost:3002/socket.io/:path*',
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

