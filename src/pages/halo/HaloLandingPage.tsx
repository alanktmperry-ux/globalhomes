import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, BadgeCheck, Heart, FileText, Users, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Post your brief",
    body: "Suburb, property type, budget, and move timeline — takes 3 minutes.",
  },
  {
    icon: Users,
    title: "Agents review your Halo",
    body: "Verified agents see your anonymous brief and reach out with matches.",
  },
  {
    icon: CheckCircle2,
    title: "You choose",
    body: "Decide which agent to connect with. Share your contact only when ready.",
  },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "Anonymous by default",
    body: "Agents see your brief, not your details, until you say yes.",
  },
  {
    icon: BadgeCheck,
    title: "Verified agents only",
    body: "Every agent is licence-checked before they can contact you.",
  },
  {
    icon: Heart,
    title: "Always free for buyers",
    body: "No fees, no commissions, no catches — ever.",
  },
];

export default function HaloLandingPage() {
  return (
    <>
      <Helmet>
        <title>Halo — Find your perfect property match | ListHQ</title>
        <meta
          name="description"
          content="Post a Halo brief and let verified Australian agents come to you. Free for buyers. The reverse property marketplace only on ListHQ."
        />
      </Helmet>

      <main className="min-h-screen bg-background font-body">
        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider">
              HALO — BUYER-LED PROPERTY SEARCH
            </span>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Tell agents exactly what you want. They come to you.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Post a Halo brief in 3 minutes. Verified agents match you — no spam, no cold calls, no chasing.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button asChild size="lg" className="rounded-xl h-12 px-8 text-base">
                <Link to="/signup">Create your Halo — free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl h-12 px-8 text-base">
                <Link to="/agents/login">I'm an agent — see active Halos</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-foreground">
              How it works
            </h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="bg-background rounded-xl p-6 sm:p-8 border border-border shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust signals */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {trust.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className="text-center md:text-left">
                  <div className="inline-flex w-12 h-12 rounded-xl bg-primary/10 text-primary items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">{t.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* For agents */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 bg-muted/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Are you a real estate agent?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Browse active buyer briefs in your area. Unlock contact details with Halo Credits.
            </p>
            <Link
              to="/agents/login"
              className="mt-6 inline-block text-primary font-semibold hover:underline"
            >
              View Halo Board →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
