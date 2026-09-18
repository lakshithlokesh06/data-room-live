"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/auth/display";
import { activePeople, type ActivePerson } from "@/lib/realtime/presence";
import { createRefreshCoalescer } from "@/lib/realtime/scopes";
import { createClient } from "@/lib/supabase/client";

export function WorkspacePresence({ workspaceId, userId, displayName, issueId }: {
  workspaceId: string; userId: string; displayName: string; issueId?: string;
}) {
  const router = useRouter();
  const [people, setPeople] = useState<ActivePerson[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`workspace:${workspaceId}`, { config: { private: true } });
    const refresher = createRefreshCoalescer(() => router.refresh());
    let active = true;
    channel.on("presence", { event: "sync" }, () => {
      if (active) setPeople(activePeople(channel.presenceState()));
    });
    if (issueId) {
      channel.on("broadcast", { event: "comment_changed" }, (message) => {
        if (active && message.payload?.issue_id === issueId) refresher.notify();
      });
    }
    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        setConnected(true);
        void channel.track({ userId, name: displayName });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnected(false);
        setPeople([]);
      }
    });
    return () => {
      active = false;
      refresher.dispose();
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, userId, displayName, issueId, router]);

  return <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
    <div className="flex -space-x-2" aria-hidden="true">{people.slice(0, 3).map((person) =>
      <Avatar className="size-6 border-2 border-background" key={person.userId}><AvatarFallback className="text-[9px]">{getInitials(person.name)}</AvatarFallback></Avatar>)}</div>
    <span>{connected ? `${people.length} ${people.length === 1 ? "person" : "people"} active` : "Presence reconnecting"}</span>
  </div>;
}
