export type ActivePerson = { userId: string; name: string };

export function activePeople(state: Record<string, unknown[]>): ActivePerson[] {
  const people = new Map<string, ActivePerson>();
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const { userId, name } = entry as Record<string, unknown>;
      if (typeof userId !== "string" || !userId || people.has(userId)) continue;
      people.set(userId, {
        userId,
        name: typeof name === "string" && name.trim() && !name.includes("@")
          ? name.trim().slice(0, 80) : "Workspace member",
      });
    }
  }
  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
}
