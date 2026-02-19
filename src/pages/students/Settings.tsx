import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentSettings() {
  const { profile, signOut } = useAuth();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Account and app preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Name:</span> {profile?.displayName ?? ""}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Email:</span> {profile?.email ?? ""}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Hub:</span> {profile?.hub ?? ""}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">No preferences configured yet.</div>
          </CardContent>
        </Card>

        <div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
