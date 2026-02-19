import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseAuth, firestore } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function StudentProfile() {
  const { profile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
  }, [profile?.displayName]);

  async function save() {
    const user = firebaseAuth.currentUser;
    if (!user) return;

    const name = displayName.trim();
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile(user, { displayName: name });

      await setDoc(
        doc(firestore, "users", user.uid),
        {
          displayName: name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await setDoc(
        doc(firestore, "students", user.uid),
        {
          displayName: name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Account settings and hub details.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Name</div>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="text-sm"><span className="text-muted-foreground">Email:</span> {profile?.email ?? ""}</div>
            <div className="text-sm"><span className="text-muted-foreground">Role:</span> {profile?.role ?? ""}</div>
            <div className="text-sm"><span className="text-muted-foreground">Hub:</span> {profile?.hub ?? ""}</div>

            {saveError && <div className="text-sm text-muted-foreground break-words">{saveError}</div>}

            <div className="flex items-center justify-end">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
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
