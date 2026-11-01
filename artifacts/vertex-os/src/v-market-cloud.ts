import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VMarketEntry } from "./v-market";

/* ------------------------------------------------------------------ */
/* V-MARKET shared catalogue                                           */
/*                                                                     */
/* Listings published in V-STUDIOS used to live only in localStorage,  */
/* so nobody else could ever see them. This module keeps them in the   */
/* same Supabase project the Messages app already uses, which makes a  */
/* published app show up for every visitor of the site.                */
/*                                                                     */
/* Ownership is a per-browser key instead of an account: the key is    */
/* sent as a request header, and the row-level security policies only  */
/* allow the browser that created a row to update or delete it.        */
/* ------------------------------------------------------------------ */

const TABLE = "v_market_apps";
const OWNER_STORAGE_KEY = "vertex-vmarket-owner-v1";
const OWNER_HEADER = "x-vmarket-owner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

/** Stable per-browser ownership token. Never leaves the device except as a header. */
export function marketOwnerKey(): string {
  try {
    const stored = localStorage.getItem(OWNER_STORAGE_KEY);
    if (stored && stored.length > 8) return stored;
    const key = `vm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(OWNER_STORAGE_KEY, key);
    return key;
  } catch {
    return "vm_anonymous";
  }
}

const client: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { [OWNER_HEADER]: marketOwnerKey() } },
      })
    : null;

export const marketCloudAvailable = Boolean(client);

let tableMissing = false;
/** True once Supabase answered that the listings table does not exist yet. */
export const marketCloudTableMissing = () => tableMissing;

type MarketRow = {
  id?: string;
  downloads?: number;
  rating?: number;
  entry?: VMarketEntry | null;
};

const isMissingTable = (error: { code?: string; message?: string } | null | undefined): boolean =>
  Boolean(error) &&
  (error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table|does not exist|schema cache/i.test(error?.message ?? ""));

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function rowToEntry(row: MarketRow): VMarketEntry | null {
  const base = row.entry;
  if (!base || typeof base !== "object" || !row.id) return null;
  const type: VMarketEntry["type"] = base.type === "game" || base.type === "app" ? base.type : "website";
  return {
    ...base,
    id: row.id,
    name: typeof base.name === "string" ? base.name : "",
    company: typeof base.company === "string" ? base.company : "Unknown studio",
    tagline: typeof base.tagline === "string" ? base.tagline : "",
    description: typeof base.description === "string" ? base.description : "",
    logo: typeof base.logo === "string" ? base.logo : "",
    category: typeof base.category === "string" ? base.category : "Tools",
    type,
    age: numberOr(base.age, 7),
    downloads: numberOr(row.downloads, numberOr(base.downloads, 0)),
    rating: Math.max(0, Math.min(5, numberOr(row.rating, numberOr(base.rating, 5)))),
    ratingCount: numberOr(base.ratingCount, 0),
    version: typeof base.version === "string" ? base.version : "1.0",
    size: typeof base.size === "string" ? base.size : "",
    url: typeof base.url === "string" ? base.url : undefined,
    html: typeof base.html === "string" ? base.html : undefined,
    features: stringList(base.features),
    screenshots: stringList(base.screenshots),
    reviews: Array.isArray(base.reviews) ? base.reviews : [],
    comments: Array.isArray(base.comments) ? base.comments : [],
    createdAt: numberOr(base.createdAt, Date.now()),
    verified: Boolean(base.verified),
    // A shared listing is never "mine" on someone else's device.
    publishedByUser: false,
    cloudOnly: true,
  };
}

/** Every listing published by anyone. `null` means the cloud is unavailable. */
export async function marketCloudList(): Promise<VMarketEntry[] | null> {
  if (!client) return null;
  const { data, error } = await client
    .from(TABLE)
    .select("id, downloads, rating, entry")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    tableMissing = isMissingTable(error);
    return null;
  }
  tableMissing = false;
  return (data ?? [])
    .map((row) => rowToEntry(row as MarketRow))
    .filter((entry): entry is VMarketEntry => Boolean(entry && entry.name));
}

/** Fetch one listing, used when another user's app is opened. */
export async function marketCloudGet(id: string): Promise<VMarketEntry | null> {
  if (!client) return null;
  const { data, error } = await client
    .from(TABLE)
    .select("id, downloads, rating, entry")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    tableMissing = isMissingTable(error);
    return null;
  }
  return data ? rowToEntry(data as MarketRow) : null;
}

export async function marketCloudPublish(entry: VMarketEntry): Promise<{ ok: boolean; error?: string }> {
  if (!client) return { ok: false, error: "Cloud sync is not configured." };
  const payload = {
    id: entry.id,
    owner_key: marketOwnerKey(),
    publisher: entry.company,
    name: entry.name,
    kind: entry.type,
    category: entry.category,
    downloads: entry.downloads ?? 0,
    rating: Math.max(0, Math.min(5, entry.rating ?? 5)),
    entry: { ...entry, publishedByUser: false, cloudOnly: undefined },
  };
  const { error } = await client.from(TABLE).upsert(payload, { onConflict: "id" });
  if (error) {
    tableMissing = isMissingTable(error);
    return { ok: false, error: error.message };
  }
  tableMissing = false;
  return { ok: true };
}

export async function marketCloudDelete(id: string): Promise<boolean> {
  if (!client) return false;
  const { error } = await client.from(TABLE).delete().eq("id", id);
  if (error) {
    tableMissing = isMissingTable(error);
    return false;
  }
  return true;
}

/** Public "downloads" counter. Safe for anonymous visitors (security definer RPC). */
export async function marketCloudInstall(id: string): Promise<void> {
  if (!client) return;
  try {
    await client.rpc("v_market_install", { p_id: id });
  } catch {
    /* offline / setup not applied yet */
  }
}

/** Live updates so a publish shows up for everyone without refreshing. */
export function marketCloudSubscribe(onChange: () => void): () => void {
  if (!client) return () => {};
  try {
    const channel = client
      .channel("v-market-apps")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
