import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swMinify: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
    },
});

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

export default withPWA(nextConfig);
