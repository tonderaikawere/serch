import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HUBS } from "@/lib/hubs";

type UserRow = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  hub?: string | null;
  kind: "student" | "instructor";
};

type ProfileDoc = {
  displayName?: string | null;
  email?: string | null;
  hub?: string | null;
};

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [hubFilter, setHubFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [studentsSnap, instructorsSnap] = await Promise.all([
          getDocs(collection(firestore, "students")),
          getDocs(collection(firestore, "instructors")),
        ]);

        const next: UserRow[] = [];

        studentsSnap.forEach((d) => {
          const data = d.data() as ProfileDoc;
          next.push({
            uid: d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
            kind: "student",
          });
        });

        instructorsSnap.forEach((d) => {
          const data = d.data() as ProfileDoc;
          next.push({
            uid: d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
            kind: "instructor",
          });
        });

        if (!cancelled) setRows(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (hubFilter === "all") return rows;
    return rows.filter((r) => (r.hub ?? "") === hubFilter);
  }, [hubFilter, rows]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Students and instructors across hubs.</p>
          </div>

          <div className="min-w-[240px]">
            <Select value={hubFilter} onValueChange={setHubFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by hub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hubs</SelectItem>
                {HUBS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{loading ? "Loading..." : `${filtered.length} users`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No users found.</div>
            )}

            {filtered.map((r) => (
              <div key={`${r.kind}:${r.uid}`} className="flex items-center justify-between gap-4 border-b border-border last:border-b-0 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {r.displayName || "(no name)"} <span className="text-muted-foreground">• {r.kind}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{r.email || r.uid}</div>
                  <div className="text-xs text-muted-foreground">Hub: {r.hub || "(none)"}</div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const ok = window.confirm(`Delete ${r.kind} profile for ${r.displayName || r.email || r.uid}?`);
                    if (!ok) return;

                    await deleteDoc(doc(firestore, r.kind === "student" ? "students" : "instructors", r.uid));
                    setRows((prev) => prev.filter((x) => !(x.uid === r.uid && x.kind === r.kind)));
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
