import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Landing() {
  const { user, profile } = useAuth();

  const openAppPath =
    profile?.role === "admin" ? "/admin" : profile?.role === "instructor" ? "/instructors" : "/students";

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-primary-foreground text-xl">
            Serch
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to={openAppPath}>
                <Button variant="secondary">Open App</Button>
              </Link>
              <Link to="/site" aria-label="Visit site">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL ?? undefined} />
                  <AvatarFallback>{(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center mt-12">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-primary-foreground mb-6">
            SEO training that feels like real work
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-2xl mb-10">
            A practical training platform for SEO, digital marketing, and technical optimization. Built with industry workflows.
          </p>

          <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
            <Card className="p-6 bg-card/10 backdrop-blur-md border-border/20">
              <h3 className="font-display font-semibold text-primary-foreground mb-2">Learn</h3>
              <p className="text-sm text-primary-foreground/70">Progressive modules that unlock practice as you level up.</p>
            </Card>
            <Card className="p-6 bg-card/10 backdrop-blur-md border-border/20">
              <h3 className="font-display font-semibold text-primary-foreground mb-2">Practice</h3>
              <p className="text-sm text-primary-foreground/70">Work on real scenarios: content, keywords, schema, and technical audits.</p>
            </Card>
            <Card className="p-6 bg-card/10 backdrop-blur-md border-border/20">
              <h3 className="font-display font-semibold text-primary-foreground mb-2">Track</h3>
              <p className="text-sm text-primary-foreground/70">Dashboards for students, instructors, and admins across hubs.</p>
            </Card>
          </div>

          {!user && (
            <div className="mt-10 flex items-center gap-3">
              <Link to="/signup">
                <Button size="lg">Get started</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  I already have an account
                </Button>
              </Link>
            </div>
          )}
        </main>

        <footer className="text-center text-primary-foreground/40 text-sm mt-8">We work with uncommon.org</footer>
      </div>
    </div>
  );
}
