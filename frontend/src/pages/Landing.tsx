import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Shield, ArrowRight, CloudRain, Zap, Banknote, Users, TrendingUp, IndianRupee } from "lucide-react";

const steps = [
  { icon: <Users className="h-8 w-8" />, title: "Register", description: "Sign up with your phone and verify KYC in under 2 minutes." },
  { icon: <Shield className="h-8 w-8" />, title: "Get Covered", description: "Choose a plan and activate weekly disruption coverage instantly." },
  { icon: <CloudRain className="h-8 w-8" />, title: "Auto-Detect", description: "Our system monitors weather, AQI and platform outages in real-time." },
  { icon: <Banknote className="h-8 w-8" />, title: "Get Paid", description: "Claims are auto-triggered and payouts hit your UPI within hours." },
];

const stats = [
  { value: "12,400+", label: "Workers Protected", icon: <Users className="h-5 w-5" /> },
  { value: "₹2.3 Cr", label: "Claims Paid Out", icon: <IndianRupee className="h-5 w-5" /> },
  { value: "98.5%", label: "Claim Approval Rate", icon: <TrendingUp className="h-5 w-5" /> },
];

const testimonials = [
  { name: "Ramesh K.", platform: "Swiggy", city: "Mumbai", quote: "GigShield paid me ₹400 when heavy rain stopped all deliveries. I didn't even have to file a claim!", initials: "RK" },
  { name: "Priya S.", platform: "Zomato", city: "Delhi", quote: "The weekly premium is so small I barely notice it. But the payouts during bad AQI days saved my week.", initials: "PS" },
  { name: "Arjun M.", platform: "Amazon", city: "Bangalore", quote: "When Zepto had an outage, I thought I'd lose half my day's earnings. GigShield covered me automatically.", initials: "AM" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="sticky top-0 z-50 px-4 sm:px-6 shrink-0 h-18 pointer-events-none transition-all duration-300 bg-background pt-4 pb-2">
        <nav className="max-w-5xl mx-auto flex h-14 items-center gap-4 border border-border/40 rounded-full bg-sidebar backdrop-blur-xl px-4 shadow-md dark:shadow-primary/5 pointer-events-auto">
          <div className="container flex h-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold font-display">GigShield</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/login"><Button variant="ghost">Login</Button></Link>
              <Link to="/register/phone"><Button>Get Protected</Button></Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="container py-20 md:py-32 text-center ">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
          <Zap className="h-3.5 w-3.5 mr-1.5" /> Now covering Mumbai, Delhi, Bangalore
        </Badge>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display max-w-4xl mx-auto">
          Income protection for
          <span className="text-primary"> India's gig workers</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
          Automatic coverage against rain, poor AQI, heatwaves, and platform outages.
          Claims trigger automatically. Payouts hit your UPI in hours.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link to="/register/phone">
            <Button size="lg" className="text-base px-8 animate-pulse-glow">
              Get Protected <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          {/* <Link to="/login">
            <Button variant="outline" size="lg" className="text-base px-8">
              Login
            </Button>
          </Link> */}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="container py-20">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <Card className="h-full text-center border-none shadow-none bg-transparent">
                  <CardContent className="pt-6">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {step.icon}
                    </div>
                    <Badge variant="outline" className="mb-2">Step {i + 1}</Badge>
                    <h3 className="text-lg font-semibold font-display mt-2">{step.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{step.description}</p>
                  </CardContent>
                </Card>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="text-center">
              <CardHeader className="pb-2">
                <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-display">{stat.value}</p>
                <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Platform Logos */}
      <section className="border-t bg-muted/30">
        <div className="container py-12">
          <p className="text-center text-sm text-muted-foreground mb-6">Trusted by workers across leading platforms</p>
          <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap opacity-60">
            {["Swiggy", "Zomato", "Amazon", "Zepto", "Blinkit", "Dunzo"].map((name) => (
              <span key={name} className="text-lg font-semibold font-display text-foreground">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-20">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
          What workers say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{t.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{t.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{t.city}</span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm italic">"{t.quote}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8">
          {/* <Separator className="mb-8" /> */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold font-display">GigShield</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">FAQ</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">© 2026 GigShield. All rights reserved.</p>
              <Link to="/admin/login">
                <Button variant="link" size="sm" className="text-muted-foreground text-xs h-auto p-0">
                  Staff Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
