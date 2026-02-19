import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { firestore, realtimeDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onValue, push, query as rtdbQuery, ref, serverTimestamp, limitToLast } from "firebase/database";
import { Search, Send } from "lucide-react";

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
};

type ChatMessage = {
  senderUid: string;
  text: string;
  createdAt?: unknown;
};

export default function InstructorChats() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [activeStudentUid, setActiveStudentUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string } & ChatMessage>>([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) return;

    (async () => {
      setLoadingStudents(true);
      setStudentsError(null);
      try {
        const q = query(collection(firestore, "students"), where("hub", "==", hub));
        const snap = await getDocs(q);
        const next: StudentRow[] = snap.docs.map((d) => {
          const data = d.data() as {
            uid?: string;
            displayName?: string | null;
            email?: string | null;
            hub?: string | null;
          };
          return {
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
          };
        });
        if (!cancelled) {
          setStudents(next);
          if (!activeStudentUid && next.length > 0) setActiveStudentUid(next[0]!.uid);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setStudentsError(msg);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.hub]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.displayName ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [searchTerm, students]);

  const activeStudent = useMemo(() => {
    if (!activeStudentUid) return null;
    return students.find((s) => s.uid === activeStudentUid) ?? null;
  }, [activeStudentUid, students]);

  useEffect(() => {
    if (!profile?.uid || !activeStudentUid) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(realtimeDb, `chats/${profile.uid}/${activeStudentUid}/messages`);
    const q = rtdbQuery(messagesRef, limitToLast(50));

    return onValue(q, (snap) => {
      const val = snap.val() as Record<string, ChatMessage> | null;
      if (!val) {
        setMessages([]);
        return;
      }
      const next = Object.entries(val)
        .map(([id, msg]) => ({ id, ...msg }))
        .filter((m) => typeof m.text === "string" && typeof m.senderUid === "string");
      next.sort((a, b) => {
        const ta = typeof a.createdAt === "number" ? a.createdAt : 0;
        const tb = typeof b.createdAt === "number" ? b.createdAt : 0;
        return ta - tb;
      });
      setMessages(next);
    });
  }, [profile?.uid, activeStudentUid]);

  async function sendMessage() {
    const instructorUid = profile?.uid;
    const studentUid = activeStudentUid;
    const text = messageText.trim();
    if (!instructorUid || !studentUid || !text) return;

    const threadRef = ref(realtimeDb, `chats/${instructorUid}/${studentUid}/messages`);
    await push(threadRef, {
      senderUid: instructorUid,
      text,
      createdAt: serverTimestamp(),
    });
    setMessageText("");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Chats</h1>
          <p className="text-muted-foreground mt-1">Message students in your hub (text-only).</p>
        </div>

        {!profile?.hub && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a hub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Select a hub in onboarding to see your students.</div>
            </CardContent>
          </Card>
        )}

        {profile?.hub && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6 min-h-[520px]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingStudents && <div className="text-sm text-muted-foreground">Loading…</div>}

                {!loadingStudents && studentsError && (
                  <div className="text-sm text-muted-foreground break-words">{studentsError}</div>
                )}

                {!loadingStudents && !studentsError && filteredStudents.length === 0 && (
                  <div className="text-sm text-muted-foreground">No students found.</div>
                )}

                <div className="space-y-2">
                  {filteredStudents.map((s) => {
                    const active = s.uid === activeStudentUid;
                    return (
                      <button
                        key={s.uid}
                        type="button"
                        onClick={() => setActiveStudentUid(s.uid)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium text-foreground truncate">{s.displayName ?? "Unnamed student"}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email ?? s.uid}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>{activeStudent ? activeStudent.displayName ?? "Chat" : "Chat"}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {!activeStudentUid && <div className="text-sm text-muted-foreground">Select a student to start.</div>}

                {activeStudentUid && (
                  <>
                    <div className="flex-1 overflow-auto rounded-lg border border-border p-3 bg-background">
                      {messages.length === 0 && (
                        <div className="text-sm text-muted-foreground">No messages yet.</div>
                      )}

                      <div className="space-y-2">
                        {messages.map((m) => {
                          const mine = m.senderUid === profile?.uid;
                          return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type a message…"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void sendMessage();
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={!messageText.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
