import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HUBS, type Hub } from "@/lib/hubs";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

export default function Signup() {
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<AppRole, "guest" | "admin">>("student");
  const [hub, setHub] = useState<Hub | "">("");
  const [submitting, setSubmitting] = useState(false);

  const hubs = useMemo(() => [...HUBS], []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hub</Label>
            <Select value={hub} onValueChange={(v) => setHub(v as Hub)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your hub" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={submitting || !displayName || !email || !password || !hub}
            onClick={async () => {
              if (!hub) return;
              setSubmitting(true);
              try {
                await signUpWithEmail({
                  email,
                  password,
                  displayName,
                  role,
                  hub,
                });
                navigate(role === "instructor" ? "/instructors" : "/students", { replace: true });
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                toast({
                  title: "Sign up failed",
                  description: msg,
                  variant: "destructive",
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Create account
          </Button>

          <div className="pt-2 grid gap-2">
            <Button
              className="w-full"
              variant="secondary"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await signInWithGoogle();
                  navigate("/onboarding", { replace: true });
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  toast({
                    title: "Google sign-in failed",
                    description: msg,
                    variant: "destructive",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-4">
                  <svg viewBox="0 0 48 48" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.684 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.191l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.649-3.317-11.264-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                </span>
                Sign up with Google
              </span>
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await signInWithApple();
                  navigate("/onboarding", { replace: true });
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  toast({
                    title: "Apple sign-in failed",
                    description: msg,
                    variant: "destructive",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-4">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M16.365 1.43c0 1.14-.46 2.19-1.2 3-.78.85-2.06 1.5-3.16 1.41-.13-1.11.36-2.24 1.12-3.05.82-.87 2.24-1.5 3.24-1.36ZM20.5 17.2c-.54 1.23-.8 1.78-1.5 2.86-.98 1.5-2.36 3.37-4.07 3.39-1.52.02-1.91-.99-3.96-.98-2.05.01-2.48 1-4 .98-1.71-.02-3.02-1.71-4-3.2C.9 18.56-.2 15.39.68 13.16c.62-1.58 2.02-2.58 3.54-2.6 1.56-.02 3.02 1.07 3.96 1.07.92 0 2.67-1.32 4.5-1.13.77.03 2.93.31 4.32 2.33-3.76 2.06-3.15 7.45.5 8.37ZM12.23 9.5c-1.3 0-2.64-.93-3.52-.93-1.16 0-2.36.9-3.12.9C3.9 9.47 2.5 8.5 1.3 6.6-.08 4.4.4 1.7 2.1.6c1.3-.85 3.03-.68 4.28.18.95.65 1.76 1.65 2.8 1.65 1.05 0 1.45-.65 2.55-1.6 1.44-1.26 3.2-1.55 4.56-.9.92.44 1.64 1.1 2.2 1.92-1.94 1.16-2.1 3.87-.42 5.22-.58 1.7-2 3.25-3.98 3.33-1.1.04-2.15-.9-3.26-.9Z"/>
                  </svg>
                </span>
                Sign up with Apple
              </span>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Already have an account? <Link className="underline" to="/login">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
