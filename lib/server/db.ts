/**
 * Server-only Supabase access. Uses the project's secret key, which must never
 * reach the browser (no NEXT_PUBLIC_ prefix). Tables have RLS on with no
 * policies, so only this key can read or write them.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Null when the database isn't configured; callers answer 503 instead of crashing. */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

/** Server-side RPC: a private key-bearing URL if set, else the browser one, else public mainnet. */
export const serverRpcUrl = () =>
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
