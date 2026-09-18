"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createRefreshCoalescer, subscriptionsForScope, type ChangeScope } from "@/lib/realtime/scopes";

export function RealtimeRefresh({ scope, showStatus = false }: { scope: ChangeScope; showStatus?: boolean }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    const subscriptions = subscriptionsForScope(JSON.parse(scopeKey) as ChangeScope);
    if (subscriptions.length === 0) return;
    const supabase = createClient();
    const refresher = createRefreshCoalescer(() => router.refresh());
    let active = true;
    const topics = [...new Set(subscriptions.map((item) => item.topic))];
    const connectedTopics = new Set<string>();
    const channels = topics.map((topic) => {
      const channel = supabase.channel(topic);
      for (const item of subscriptions.filter((subscription) => subscription.topic === topic)) {
        channel.on("postgres_changes", {
          event: item.event, schema: "public", table: item.table, filter: item.filter,
        }, () => refresher.notify());
      }
      channel.subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          connectedTopics.add(topic);
          setConnected(connectedTopics.size === topics.length);
          refresher.notify();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          connectedTopics.delete(topic);
          setConnected(false);
        }
      });
      return channel;
    });
    return () => {
      active = false;
      refresher.dispose();
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [router, scopeKey]);

  return showStatus ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
    <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-600" : "bg-muted-foreground"}`} aria-hidden="true" />
    {connected ? "Live" : "Reconnecting"}
  </span> : null;
}
