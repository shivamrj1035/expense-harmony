import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "SpendWise - Gen-Z Expense Tracker",
    description: "Track your expenses with style and ease.",
    manifest: "/manifest.json",
    appleWebApp: {
        title: "SpendWise",
        statusBarStyle: "black-translucent",
        capable: true,
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport = {
    themeColor: "#000000",
    viewportFit: "cover",
};

import { PageLoader } from "@/components/ui/PageLoader";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            afterSignOutUrl="/"
        >
            <html lang="en" suppressHydrationWarning>
                <head>
                    {/* iOS Splash Screens */}
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-1179-2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-1284-2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                    <link rel="apple-touch-startup-image" href="/splash/apple-splash-1170-2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                </head>
                <body className={inter.className}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <PageLoader />
                        {children}
                        <Toaster position="top-right" />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
