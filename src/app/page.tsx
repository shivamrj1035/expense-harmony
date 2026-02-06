import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, BarChart3, Bell, Sparkles } from "lucide-react";

export default function LandingPage() {
    const { userId } = auth();

    if (userId) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen mesh-gradient overflow-hidden">
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gradient">SpendWise</span>
                </div>
                <Link href="/dashboard">
                    <Button variant="ghost" className="hover:bg-white/10">Log In</Button>
                </Link>
            </nav>

            {/* Hero */}
            <main className="relative z-10 pt-20 pb-32 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6 animate-float">
                    <Sparkles className="h-3 w-3" />
                    The future of expense tracking is here
                </div>

                <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8">
                    Manage your cash <br />
                    <span className="text-gradient">with zero effort.</span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mb-12">
                    Clean, minimal, and SaaS-style expense tracking for the next generation.
                    Auto-recurring expenses, weekly reports, and crazy UI.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/dashboard">
                        <Button size="lg" className="bg-gradient-primary h-14 px-8 text-lg glow-primary group">
                            Start Tracking Now
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </Link>
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 hover:bg-white/5">
                        View Live Demo
                    </Button>
                </div>

                {/* Feature Preview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
                    {[
                        { icon: <BarChart3 className="h-6 w-6" />, title: "Smart Analytics", desc: "Interactive charts powered by Recharts" },
                        { icon: <Bell className="h-6 w-6" />, title: "Auto-Reports", desc: "Daily & Weekly reports via Gmail" },
                        { icon: <Sparkles className="h-6 w-6" />, title: "Glass UI", desc: "Production-ready Gen-Z aesthetic" },
                    ].map((f, i) => (
                        <div key={i} className="glass-card p-8 text-left border-white/5 hover:border-white/20 transition-all hover:scale-[1.02]">
                            <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-primary">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                            <p className="text-muted-foreground">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Decorative Glows */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />
        </div>
    );
}
