import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Bell, 
  ArrowRight, 
  Sparkles,
  Shield,
  Zap
} from "lucide-react";

const features = [
  {
    icon: PieChart,
    title: "Visual Insights",
    description: "Beautiful charts that make sense of your spending",
    color: "text-primary",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a recurring expense again",
    color: "text-secondary",
  },
  {
    icon: TrendingUp,
    title: "Track Trends",
    description: "See where your money goes over time",
    color: "text-accent",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data stays yours, always encrypted",
    color: "text-destructive",
  },
];

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-gradient">SpendWise</span>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          variant="outline"
          className="border-primary/50 hover:bg-primary/10"
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 pt-12 pb-24 lg:pt-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Track expenses like never before</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in">
            Your money,{" "}
            <span className="text-gradient">visualized</span>
            <br />
            <span className="text-gradient-secondary">& simplified</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            The expense tracker that actually makes sense. Beautiful charts, 
            smart categories, and insights that help you save more.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary hover:opacity-90 glow-primary text-lg px-8 gap-2"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border hover:bg-muted/50 text-lg px-8"
            >
              <Zap className="h-5 w-5 mr-2" />
              See Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {features.map((feature, i) => (
            <GlassCard
              key={i}
              variant="elevated"
              className="text-center animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className={`h-12 w-12 mx-auto rounded-xl bg-current/10 flex items-center justify-center mb-4 ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-24">
          <div className="text-center">
            <p className="text-4xl font-bold text-gradient">10K+</p>
            <p className="text-muted-foreground">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gradient-secondary">$2M+</p>
            <p className="text-muted-foreground">Tracked Daily</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gradient">4.9★</p>
            <p className="text-muted-foreground">User Rating</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-muted-foreground text-sm">
        <p>© 2024 SpendWise. Built for Gen-Z, by Gen-Z ✨</p>
      </footer>
    </div>
  );
}
