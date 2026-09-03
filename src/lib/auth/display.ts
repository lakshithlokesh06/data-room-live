import type { AuthenticatedUser } from "@/lib/auth/session";

export function getDisplayName(user: AuthenticatedUser) {
  return user.fullName || user.email;
}

export function getInitials(nameOrEmail: string) {
  const [namePart] = nameOrEmail.split("@");
  const tokens = namePart
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "DR";
  }

  return tokens.map((token) => token[0]?.toUpperCase()).join("");
}
