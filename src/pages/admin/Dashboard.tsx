import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and controls.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signed in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm"><span className="text-muted-foreground">Name:</span> {profile?.displayName ?? ""}</div>
            <div className="text-sm"><span className="text-muted-foreground">Email:</span> {profile?.email ?? ""}</div>
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
