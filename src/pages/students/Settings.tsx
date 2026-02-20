import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function StudentSettings() {
  const { profile, signOut } = useAuth();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Account and app preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label className="text-sm">Email notifications</Label>
                  <div className="text-xs text-muted-foreground">Progress reminders and updates.</div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label className="text-sm">Product updates</Label>
                  <div className="text-xs text-muted-foreground">New features and improvements.</div>
                </div>
                <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label className="text-sm">Reduce motion</Label>
                  <div className="text-xs text-muted-foreground">Minimize animations for comfort.</div>
                </div>
                <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label className="text-sm">Compact mode</Label>
                  <div className="text-xs text-muted-foreground">Tighter spacing for small screens.</div>
                </div>
                <Switch checked={compactMode} onCheckedChange={setCompactMode} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Manage your active session.</div>
              <Button
                variant="secondary"
                onClick={async () => {
                  await signOut();
                }}
              >
                Log out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
