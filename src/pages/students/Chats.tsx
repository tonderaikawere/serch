import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { firestore, realtimeDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { limitToLast, onValue, push, query as rtdbQuery, ref, serverTimestamp } from "firebase/database";
import { Search, Send } from "lucide-react";

type InstructorRow = {
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

export default function StudentChats() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [instructorsError, setInstructorsError] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);

  const [activeInstructorUid, setActiveInstructorUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string } & ChatMessage>>([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) return;

    (async () => {
      setLoadingInstructors(true);
      setInstructorsError(null);
      try {
        const q = query(collection(firestore, "instructors"), where("hub", "==", hub));
        const snap = await getDocs(q);
        const next: InstructorRow[] = snap.docs.map((d) => {
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
          setInstructors(next);
          if (!activeInstructorUid && next.length > 0) setActiveInstructorUid(next[0]!.uid);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setInstructorsError(msg);
      } finally {
        if (!cancelled) setLoadingInstructors(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.hub]);

  const filteredInstructors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter((s) => {
      const name = (s.displayName ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [searchTerm, instructors]);

  const activeInstructor = useMemo(() => {
    if (!activeInstructorUid) return null;
    return instructors.find((s) => s.uid === activeInstructorUid) ?? null;
  }, [activeInstructorUid, instructors]);

  useEffect(() => {
    const studentUid = profile?.uid;
    const instructorUid = activeInstructorUid;
    if (!studentUid || !instructorUid) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(realtimeDb, `chats/${instructorUid}/${studentUid}/messages`);
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
  }, [profile?.uid, activeInstructorUid]);

  async function sendMessage() {
    const studentUid = profile?.uid;
    const instructorUid = activeInstructorUid;
    const text = messageText.trim();
    if (!studentUid || !instructorUid || !text) return;

    const threadRef = ref(realtimeDb, `chats/${instructorUid}/${studentUid}/messages`);
    await push(threadRef, {
      senderUid: studentUid,
      text,
      createdAt: serverTimestamp(),
    });
    setMessageText("");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Chat</h1>
          <p className="text-muted-foreground mt-1">Message your instructor(s) in your hub.</p>
        </div>

        {!profile?.hub && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a hub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Select a hub in onboarding to see your instructors.</div>
            </CardContent>
          </Card>
        )}

        {profile?.hub && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6 min-h-[520px]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>Instructors</CardTitle>
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

                {loadingInstructors && <div className="text-sm text-muted-foreground">Loading…</div>}

                {!loadingInstructors && instructorsError && (
                  <div className="text-sm text-muted-foreground break-words">{instructorsError}</div>
                )}

                {!loadingInstructors && !instructorsError && filteredInstructors.length === 0 && (
                  <div className="text-sm text-muted-foreground">No instructors found for this hub.</div>
                )}

                <div className="space-y-2">
                  {filteredInstructors.map((s) => {
                    const active = s.uid === activeInstructorUid;
                    return (
                      <button
                        key={s.uid}
                        type="button"
                        onClick={() => setActiveInstructorUid(s.uid)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium text-foreground truncate">{s.displayName ?? "Instructor"}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email ?? s.uid}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>{activeInstructor ? activeInstructor.displayName ?? "Chat" : "Chat"}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {!activeInstructorUid && <div className="text-sm text-muted-foreground">Select an instructor to start.</div>}

                {activeInstructorUid && (
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
                      <Button type="button" onClick={() => void sendMessage()} disabled={!messageText.trim()}>
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
