import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/expenses(.*)",
    "/categories(.*)",
    "/settings(.*)",
]);

const isPublicRoute = createRouteMatcher(["/"]);

export default clerkMiddleware((auth, req) => {
    const { userId } = auth();

    // If user is logged in and tries to access the landing page, redirect to dashboard
    if (userId && isPublicRoute(req)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (isProtectedRoute(req)) auth().protect();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
