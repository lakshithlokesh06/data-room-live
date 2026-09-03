export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Missing Supabase URL or anon key configuration.");
  }

  return config;
}
