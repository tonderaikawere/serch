import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HUBS, type Hub } from "@/lib/hubs";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

export default function Onboarding() {
  const { profile, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const forcedInstructor = (profile?.email ?? "").toLowerCase().endsWith("@uncommon.org");

  const [role, setRole] = useState<Exclude<AppRole, "guest" | "admin">>(forcedInstructor ? "instructor" : "student");
  const [hub, setHub] = useState<Hub | "">("");
  const [submitting, setSubmitting] = useState(false);

  const hubs = useMemo(() => [...HUBS], []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finish setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {profile?.displayName ? `Welcome, ${profile.displayName}.` : "Welcome."} Choose your role and hub.
          </div>

          {!forcedInstructor && (
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
          )}

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
            disabled={submitting || !hub}
            onClick={async () => {
              if (!hub) return;
              setSubmitting(true);
              try {
                await completeOnboarding({ role, hub });
                navigate(role === "instructor" ? "/instructors" : "/students", { replace: true });
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                toast({
                  title: "Setup failed",
                  description: msg,
                  variant: "destructive",
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
