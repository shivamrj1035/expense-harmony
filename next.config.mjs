/** @type {import('next').NextConfig} */
const nextConfig = {
    // Add your config here
    typescript: {
        ignoreBuildErrors: true, // Optional: for faster initial deployment if needed
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
